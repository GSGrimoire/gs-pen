import unittest
from scripts.probe_public_captions import caption_track_urls, parse_vtt, is_approved_track_url


class CaptionProbeTests(unittest.TestCase):
    def test_tiktok_hydration(self):
        page = '''<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
        {"__DEFAULT_SCOPE__":{"webapp.video-detail":{"itemInfo":{"itemStruct":{"cla_info":{
        "caption_infos":[{"url":"https://cdn.tiktokcdn.com/tracks/test.vtt"}]}}}}}}
        </script>'''
        self.assertEqual(caption_track_urls(page), ["https://cdn.tiktokcdn.com/tracks/test.vtt"])

    def test_no_claim_when_empty(self):
        self.assertEqual(caption_track_urls("<html>No tracks</html>"), [])
        self.assertEqual(parse_vtt(b"not a caption file"), 0)
        self.assertEqual(parse_vtt(b"WEBVTT\n\n"), 0)

    def test_vtt_cues(self):
        self.assertEqual(parse_vtt(b"WEBVTT\n\n00:00:01.000 --> 00:00:03.200\nTest line\n"), 1)

    def test_track_url_allowlist(self):
        for link in [
            "https://tiktokcdn.com/caption.vtt",
            "https://a.tiktokcdn.com/caption.vtt",
            "https://v16m-webapp.tiktokcdn-us.com/caption.vtt",
        ]:
            self.assertTrue(is_approved_track_url(link))
        for link in [
            "http://tiktokcdn.com/caption.vtt",
            "https://tiktokcdn.com.evil.test/caption.vtt",
            "https://tiktokcdn-us.com.evil.test/caption.vtt",
            "https://127.0.0.1/caption.vtt",
            "https://user@tiktokcdn.com/caption.vtt",
            "https://tiktokcdn.com:8080/caption.vtt"
        ]:
            self.assertFalse(is_approved_track_url(link))


if __name__ == "__main__":
    unittest.main()

