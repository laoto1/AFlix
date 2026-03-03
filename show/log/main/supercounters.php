Method: GET
URL
http://14.225.254.182/supercounters.php?v4
Headers
Accept:
*/*
Accept-Encoding:
gzip, deflate
Accept-Language:
en-US,en;q=0.9
Connection:
keep-alive
Cookie:
hideavatar=false; _acx=MH4ANDMH9Yx599ox8we2fA==; _ga_MNX3PR1HR4=GS2.1.s1772566243$o1$g1$t1772566338$j60$l0$h0;
_ga=GA1.1.1323438064.1772566243; _gid=GA1.1.125545754.1772566243; lang=vi; PHPSESSID=kaa9he3um3ul7bn6mhe1o06q25;
arouting=e;
_gac=b9faed171d93d5dd8dcdffe32086c3ad6HqDmbXfJh5n0eN950+qkHDeoU+iYt+eZ6mi4DAmYk+xzfc4H8CiUtrFovOif9CuTGP60A==;
_ac=5ea403b84c07c3e664b879faf4eacbe2; UGVyc2lzdFN0b3JhZ2U=%7B%7D; __PPU_ppucnt=1
Host:
14.225.254.182
Referer:
http://14.225.254.182/
User-Agent:
Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0
200
Status: 200 OK
Headers
Cache-Control:
public
Connection:
keep-alive
Content-Encoding:
gzip
Content-Length:
684
Content-Type:
text/javascript;charset=UTF-8
Date:
Tue, 03 Mar 2026 19:55:35 GMT
Expires:
Wed, 08 Apr 2026 19:55:12
Server:
nginx/1.18.0 (Ubuntu)
Vary:
Accept-Encoding
X-Powered-By:
PHP/7.4.29
X-Powered-By:
ARR/3.0
X-Powered-By:
The NG Project 1.1

response body:
function sc_online_t(id, label, fcolor) {
var info;
var d = document;
var ref = "" + d.referrer;
var url = "" + window.location;
ref = ref.substring(0, 600);
url = url.substring(0, 300);

if (encodeURIComponent) {
info = '&ua=' + encodeURIComponent(navigator.userAgent);
info = info + '&url=' + encodeURIComponent(url);
info = info + '&ref=' + encodeURIComponent(ref);
} else {
info = '&ua=' + escape(navigator.userAgent);
info = info + '&url=' + escape(url);
info = info + '&ref=' + escape(ref);
}

info = info + '&sw=' + screen.width;
info = info + '&sh=' + screen.height;
info = info + '&rand=' + Math.round(100 * Math.random());
info = info + '&label=' + label;
info = info + '&fcolor=' + fcolor;

var ga = document.createElement('script');
ga.type = 'text/javascript';
ga.async = "async";
ga.src = "//service.supercounters.com/fc.php?id=" + id + "&w=1&v=1" + info;
var a = document.getElementsByTagName("script")[0];
a.parentNode.insertBefore(ga, a);
}

function sc_onlinetext(id, out) {
var a = document.createElement("a");
a.setAttribute('href', "//www.supercounters.com/stats/" + id);
a.setAttribute('title', "Real-time web tracking from supercounters");
a.setAttribute('target', "_blank");
a.innerHTML = out;

ct_insert(a, "supercounters.php");
}

function ct_insert(c, d) {
var a = document.getElementsByTagName("script");
for (var b = 0; b < a.length; b++) { if (a[b].src.indexOf(d)> 0) {
    a[b].parentNode.insertBefore(c, a[b].nextSibling)
    }
    }
    }