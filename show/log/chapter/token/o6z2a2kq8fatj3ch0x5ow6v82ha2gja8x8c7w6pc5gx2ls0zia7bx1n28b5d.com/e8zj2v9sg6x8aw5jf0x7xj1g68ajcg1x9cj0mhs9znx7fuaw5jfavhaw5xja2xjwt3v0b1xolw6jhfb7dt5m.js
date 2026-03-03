Method: GET
URL
https://o6z2a2kq8fatj3ch0x5ow6v82ha2gja8x8c7w6pc5gx2ls0zia7bx1n28b5d.com/e8zj2v9sg6x8aw5jf0x7xj1g68ajcg1x9cj0mhs9znx7fuaw5jfavhaw5xja2xjwt3v0b1xolw6jhfb7dt5m.js
Headers
Accept:
*/*
Accept-Encoding:
gzip, deflate, br, zstd
Accept-Language:
en-US,en;q=0.9
Connection:
keep-alive
Host:
o6z2a2kq8fatj3ch0x5ow6v82ha2gja8x8c7w6pc5gx2ls0zia7bx1n28b5d.com
Referer:
http://14.225.254.182/
Sec-Fetch-Dest:
script
Sec-Fetch-Mode:
no-cors
Sec-Fetch-Site:
cross-site
User-Agent:
Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0
200
Status: 200 OK
Headers
Age:
536
alt-svc:
h3=":443"; ma=86400
Cache-Control:
max-age=14400
cf-cache-status:
HIT
CF-RAY:
9d6b98cded27409e-SIN
Connection:
keep-alive
Content-Encoding:
zstd
Content-Type:
application/javascript
Date:
Tue, 03 Mar 2026 21:05:01 GMT
etag:
W/"6534a2bd-b5d"
Last-Modified:
Sun, 22 Oct 2023 04:19:09 GMT
Nel:
{"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Report-To:
{"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=hkNesABYLMbKFXPA22fJ9RdVE0LyVp96gMegi5HouZ5a3NdZsJU8ERZM5my2D7YUmaFx5vnfHGmRCsR9GcDU6vY70lQ%2B6ejA2RxMWpILp6cIsnYayI3fvOPr7qvtjkwbHCDHhsVytTpHqCJKz6bzUpaeRqStxdU2TAAmr6xoqMw%3D"}]}
Server:
cloudflare
Transfer-Encoding:
chunked

response body:
var ghz = {

  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  popshow: function(input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    input = ghz._utf8_popshow(input);

    while (i < input.length) {

      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

    }

    return output;
  },

  yz6vqp2w0xg7qivt6qxhwm: function(input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);

      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }

    }

    output = ghz._utf8_yz6vqp2w0xg7qivt6qxhwm(output);

    return output;

  },

  _utf8_popshow: function(string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {

      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }

    }

    return utftext;
  },

  _utf8_yz6vqp2w0xg7qivt6qxhwm: function(utftext) {
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;

    while (i < utftext.length) {

      c = utftext.charCodeAt(i);

      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if ((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i + 1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        c2 = utftext.charCodeAt(i + 1);
        c3 = utftext.charCodeAt(i + 2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }

    }

    return string;
  }

}