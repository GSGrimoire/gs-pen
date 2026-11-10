// Aggregate owner-held, sanitized observations. No URLs, media, captions or free text.
export const OUTCOMES = Object.freeze([
  'native_caption_success', 'post_only_partial', 'metadata_only_partial',
  'provider_blocked', 'link_unresolved', 'unsafe_target_rejected',
  'timeout_network', 'no_available_content', 'invalid_unsupported',
  'other_safe_failure'
]);

const FIELDS = new Set(['platform','linkType','outcome','latencyMs','captionCueCount','runDate','build']);
const LINK_TYPES = {
  tiktok: new Set(['canonical_video','short_share']),
  facebook: new Set(['canonical_video','reel','video_share','post_share'])
};
const ERROR_CODES = new Set([
  'INVALID_JSON','INVALID_RECORD','UNEXPECTED_FIELD','INVALID_PLATFORM',
  'INVALID_LINK_TYPE','INVALID_OUTCOME','INVALID_LATENCY',
  'INVALID_CAPTION_COUNT','INCONSISTENT_CAPTIONS','INVALID_DATE','INVALID_BUILD',
  'EMPTY_DATA','TOO_MANY_RECORDS','INVALID_GROUP_SIZE'
]);

function invalid(code) {
  const error = new Error(code);
  error.code = ERROR_CODES.has(code) ? code : 'INVALID_RECORD';
  return error;
}
function isPlainObject(value) {
  return value !== null && typeof value === 'object' &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function validateObservation(input) {
  if(!isPlainObject(input)) throw invalid('INVALID_RECORD');
  for(const key of Object.keys(input)) if(!FIELDS.has(key)) throw invalid('UNEXPECTED_FIELD');
  const {platform,linkType,outcome,latencyMs,captionCueCount,runDate,build}=input;
  if(!Object.hasOwn(LINK_TYPES,platform)) throw invalid('INVALID_PLATFORM');
  if(!LINK_TYPES[platform].has(linkType)) throw invalid('INVALID_LINK_TYPE');
  if(!OUTCOMES.includes(outcome)) throw invalid('INVALID_OUTCOME');
  if(!Number.isInteger(latencyMs) || latencyMs<0 || latencyMs>600000)
    throw invalid('INVALID_LATENCY');
  if(!Number.isInteger(captionCueCount) || captionCueCount<0 || captionCueCount>2000)
    throw invalid('INVALID_CAPTION_COUNT');
  if((outcome==='native_caption_success') !== (captionCueCount>0))
    throw invalid('INCONSISTENT_CAPTIONS');
  if(typeof runDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(runDate) ||
    Number.isNaN(Date.parse(runDate)) ||
    new Date(runDate).toISOString().slice(0,10)!==runDate)
    throw invalid('INVALID_DATE');
  if(typeof build!=='string' || !/^workspace_v\d{2}_sites_\d{1,3}$/.test(build))
    throw invalid('INVALID_BUILD');
  return Object.freeze({platform,linkType,outcome,latencyMs,captionCueCount,runDate,build});
}

export function parseObservation(line) {
  let value;
  try { value=JSON.parse(line); }
  catch { throw invalid('INVALID_JSON'); }
  return validateObservation(value);
}

function percentile(sorted,proportion) {
  return sorted[Math.max(0,Math.ceil(sorted.length*proportion)-1)];
}

function aggregate(rows) {
  const counts=Object.fromEntries(OUTCOMES.map(key=>[key,0]));
  const latencies=[], dates=new Set(), builds=new Set();
  for(const row of rows) {
    counts[row.outcome]++;
    latencies.push(row.latencyMs);
    dates.add(row.runDate); builds.add(row.build);
  }
  latencies.sort((a,b)=>a-b);
  const attempts=rows.length;
  const eligibleAttempts=attempts-counts.invalid_unsupported;
  const nativeCaptions=counts.native_caption_success;
  const contentRich=nativeCaptions+counts.post_only_partial;
  return {
    attempts,eligibleAttempts,counts,
    nativeCaptionCoverage:eligibleAttempts?nativeCaptions/eligibleAttempts:null,
    contentRichUtility:contentRich/attempts,
    metadataOnlyUtility:counts.metadata_only_partial/attempts,
    medianLatencyMs:percentile(latencies,0.5),
    p95LatencyMs:percentile(latencies,0.95),
    distinctTestDates:dates.size,distinctBuilds:builds.size
  };
}

export function summarizeReliability(inputs,{minGroupSize=5}={}) {
  if(!Number.isInteger(minGroupSize) || minGroupSize<2 || minGroupSize>1000)
    throw invalid('INVALID_GROUP_SIZE');
  if(!Array.isArray(inputs) || inputs.length===0) throw invalid('EMPTY_DATA');
  if(inputs.length>10000) throw invalid('TOO_MANY_RECORDS');
  const rows=inputs.map(validateObservation);
  const byPlatform=new Map(),byLinkType=new Map();
  for(const row of rows) {
    if(!byPlatform.has(row.platform)) byPlatform.set(row.platform,[]);
    byPlatform.get(row.platform).push(row);
    const typeKey=row.platform+':'+row.linkType;
    if(!byLinkType.has(typeKey)) byLinkType.set(typeKey,[]);
    byLinkType.get(typeKey).push(row);
  }
  function publicGroups(groups) {
    let suppressedGroups=0;
    const values={};
    for(const [label,subset] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]))) {
      if(subset.length<minGroupSize){suppressedGroups++;continue;}
      values[label]=aggregate(subset);
    }
    return {values,suppressedGroups};
  }
  return {
    schema:'gs-pen.reliability.aggregate.v1',
    minGroupSize,
    overall:rows.length>=minGroupSize?aggregate(rows):null,
    byPlatform:publicGroups(byPlatform),
    byLinkType:publicGroups(byLinkType),
    limitations:[
      'Aggregate outcomes do not prove spoken-word accuracy or provider permission.',
      'Native platform captions are not independent audio transcription.',
      'Small groups are suppressed; keep row-level observations in owner-controlled private storage.'
    ]
  };
}
