Method: GET
URL
http://14.225.254.182/stv.host.js?v=035
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
hideavatar=false; _acx=MH4ANDMH9Yx599ox8we2fA==; _ga_MNX3PR1HR4=GS2.1.s1772566243$o1$g1$t1772566338$j60$l0$h0; _ga=GA1.1.1323438064.1772566243; _gid=GA1.1.125545754.1772566243; lang=vi; PHPSESSID=kaa9he3um3ul7bn6mhe1o06q25; arouting=e; _gac=b9faed171d93d5dd8dcdffe32086c3ad6HqDmbXfJh5n0eN950+qkHDeoU+iYt+eZ6mi4DAmYk+xzfc4H8CiUtrFovOif9CuTGP60A==; _ac=5ea403b84c07c3e664b879faf4eacbe2; UGVyc2lzdFN0b3JhZ2U=%7B%7D; __PPU_ppucnt=1
Host:
14.225.254.182
Priority:
u=2
Referer:
http://14.225.254.182/
User-Agent:
Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0
200
Status: 200 OK
Headers
Accept-Ranges:
bytes
Cache-Control:
max-age=86400
Connection:
keep-alive
Content-Encoding:
gzip
Content-Length:
2574
Content-Type:
application/javascript
Date:
Tue, 03 Mar 2026 19:55:35 GMT
Last-Modified:
Thu, 14 Aug 2025 05:05:58 GMT
Server:
nginx/1.18.0 (Ubuntu)
Vary:
Accept-Encoding
X-Powered-By:
The NG Project 1.1

response body:
function dosearch(str) {
  document.location.href = "/?find=&findinname=" + encodeURI(str.normalize("NFC"));
}

function mksurfurl(str) {
  if (str.indexOf("http") < 0) {
    str = "http://" + str;
  }
  if (str.indexOf("%") < 0) {
    str = encodeURI(str);
  }
  document.location.href = "/surf.php?link=" + str;
}
var hmeta = {
  "uukanshu": [
    "uukanshu.(?:com|net)\/b\/(\\d+)\/(\\d+)?(.html)?",
    "sj.uukanshu.(?:com|net)\/\/?book(?:_amp)?.aspx\\?id=(\\d+)",
    "sj.uukanshu.(?:com|net)\/\/?read.aspx\?tid=(\\d+)&sid=(\\d+)",
    "zhaoshuyuan.(?:com|net)\/b\/(\\d+)\/(\\d+)?(.html)?",
    "zhaoshuyuan.(?:com|net)\/\/?book(?:_amp)?.aspx\\?id=(\\d+)",
    "zhaoshuyuan.(?:com|net)\/\/?read.aspx\?tid=(\\d+)&sid=(\\d+)"
  ],
  "69shu": [
    "69shuba.com\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
    "69shuba.cx\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
    "69xinshu.com\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
    "69shu.pro\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
    "69shu\\.[a-z]{3,4}\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
    "69shuba\\.[a-z]{3,4}\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
    "69shu\\.[a-z]{3,4}\/(?:txt|book\/)?(\\d+)\/?(\\d+)?",
  ],
  "69shuorg": ["69shu.org\/book[_\/](\\d+)\/(\\d+)?"],
  "shu008": ["--shu008.com\/(?:book|\\d+)\/(\\d+)\/(\\d+)?"],
  "xinyushuwu": ["xinyushuwu.com\/\\d+\/(\\d+)\/(\\d+)?"],
  "xiaoqiangwx": ["xiaoqiangwx.org\/(?:\\d+|book)\/(\\d+)\/?(\\d+)?(.html)?"],
  "cuiweijux": ["cuiweijux.com\/files\/article\/html\/\\d+\/(\\d+)\/(\\d+)?(.html)?"],
  "-aikanshu": ["aikanshu8.com\/book\/(\\d+)\.html"],
  "-kygnew": ["kygnew.com\/\\d+\/(\\d+)\/(\\d+)?(.html)?"],
  "-aikanshuba": ["aikanshuba.net\/(?:\\d+|book)\/(\\d+)\/(\\d+)?(.html)?"],
  "biquge": ["biquge.com.cn\/book\/(\\d+)\/(\\d+)?(.html)?",
    "sobiquge.com/book/(\\d+)/",
    "81zw.org/books/(\\d+)/"
  ],
  "trxs": ["trxs.cc\/tongren\/(\\d+)\/?(\\d+)?(.html)?"],
  "ikshu8": ["ikshu8.com\/book\/(\\d+)\/?(\\d+)?(.html)?"],
  "shulinw": ["shulinw.com\/(?:shu\/|yuedu\/|book\/|\\d+\/|modules\/article\/articleinfo.php\\?id=)(\\d+)(?:\/)?(\\d*)(\.html)?"],
  "wuxia1": ["wuxia1.com\/(?:shu\/|yuedu\/|book\/|\\d+\/|modules\/article\/articleinfo.php\\?id=)(\\d+)(?:\/)?(\\d*)(\.html)?"],
  "xslou": ["--xslou.com\/(?:shu|yuedu|book|\\d+)\/(\\d+)\/(\\d*)(\.html)?"],
  "shu03": ["--shu03.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "shu05": ["shu05\.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "kuhu168": ["kuhu168.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "2kxs": ["2kxs.org\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "shukw": ["--shukw.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "cn8118": ["--cn8118.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "yikanxiaoshuo": ["yikanxiaoshuo.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "xiaoshuowa": ["--xiaoshuowa.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "zwduxs": ["--zwduxs.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "8zwdu": ["8zwdu.com\/\\d+[\/_](\\d+)\/(\\d*)(\.html)?"],
  "kanmaoxian": ["kanmaoxian.com\/(?:book|\\d+)\/(\\d+)\/?(\\d*)(\.html)?"],
  "kayegenet": ["kayege.net\/(?:book|\\d+)[\/_](\\d+)\/?(\\d*)(\.html)?"],
  "4gxsw": ["4gxsw.com\/(?:book|html\/\\d+)\/(\\d+)\/?(\\d*)(\.html)?"],
  "qinqinxsw": ["qinqinxsw.com\/(?:book|\\d+)[\/_](\\d+)\/?(\\d*)(\.html)?"],
  "read8": ["read8.net\/(?:dushu)\/(\\d+)\/(\\d*)(\.html)?"],
  "ciweimao": ["ciweimao.com\/book\/(\\d+)"],
  "wkkshu": ["wkkshu.com\/(?:xs\/\\d+\/|\\d+_)(\\d+)\/(\\d*)(\.html)?"],
  "168kanshu": ["168kanshu.com\/(?:xs\/\\d+\/|\\d+_)(\\d+)\/(\\d*)(\.html)?"],
  "wanbentxt": ["wanbentxt.com\/(\\d+)\/([\\d_]*)(\.html)?"],
  "38kanshu": ["mijiashe.com\/(\\d+)\/([\\d_]*)(\.html)?"],
  "duanqingsi": ["duanqingsi.com\/(\\d+)\/([\\d_]*)(\.html)?"],
  "faloo": [
    ".faloo.com\/[pfboklithtm]+\/(\\d+)(?:\.html|\/(\\d+).html)?",
    ".faloo.com/(\\d+).html",
    ".faloo.com/(\\d+)_(\\d+).html"
  ],
  "qiuxiaoshuo": ["qiuxiaoshuo.com\/(?:book|read)[\/-](\\d+)[\/-]?(\\d*)"],
  "dibaqu123": ["dibaqu123.com\/\\d+\/(\\d+)\/?(\\d*)(\.html)?"],
  "jiacuan": ["jiacuan.com\/\\d+\/(\\d+)\/?(\\d*)(\.html)?"],
  "lsjxs2": ["--lsjxs2.xyz\/\\d+\/(\\d+)\/(\\d+)?(.html)?"],

  "shubaow": ["shubaow.net/\\d+[_/](\\d+)/(\\d*)(.html)?"],
  "jiacuan": ["jiacuan.com/\\d+/(\\d+)/(\\d*)(.html)?"],
  "biqugeinfo": ["biquge.info/\\d+_(\\d+)/(\\d*)(.html)?"],
  "shumilou": ["shumilou.net/\\d+/(\\d+)/(\\d*)(.html)?"],
  "xbiquge": ["xbiquge.cc/book/(\\d+)/(\\d*)(.html)?"],
  "paoshu8": ["paoshu8.com/\\d+_(\\d+)/(\\d*)(.html)?"],
  "duokan8": ["duokan8.com/\\d+_(\\d+)/(\\d*)(.html)?"],
  "biqugecom": ["biquge.com/\\d+_(\\d+)/(\\d*)(.html)?"],
  "hetushu": ["hetushu.com/book/(\\d+)/(\\d*)(.html)?"],
  "nofff": ["nofff.com/(\\d+)/(\\d*)\/?"],
  "uuxs": ["uuxs.tw/ls/\\d+_(\\d+)/(\\d*)(.html)?"],
  "ranwenla": ["ranwen.la/files/article/\\d+/(\\d+)/(\\d*)(.html)?"],
  "66wx": ["66wx.com/(\\d+)_\\d+/read(\\d*)(.html)?"],
  "biqugexs": ["biqugexs.com/\\d+_(\\d+)/(\\d*)(.html)?"],
  "230book": ["230book.[comnet]{3}/book/(\\d+)/(\\d*)(.html)?"],
  "shumiloutw": ["shumilou.cotw/book_(\\d+)/(\\d*)(.html)?"],
  "biqubu": ["biqubu.com/book_(\\d+)/(\\d*)(.html)?"],
  "521danmei": [
    "521danmei.org/read/(\\d+)/(\\d*)\/?",
    "521danmei.org/book/(\\d+).html"
  ],
  "bxwxorg": [
    "bxwxorg.com/read/(\\d+)/(\\d*)(.html)?",
    "bxwxorg.com/book/(\\d+).html"
  ],
  "qidian": ["qidian.com/(?:book|info)/(\\d+)"],
  "zwdu": ["zwdu.com/book/(\\d+)/(\\d*)(.html)?"],
  "xingeweb": ["xingeweb.com/ddxs/169164/(\\d*)(.html)?"],
  "zongheng": [
    "book.zongheng.com/chapter/(\\d+)/(\\d*)(.html)?",
    "book.zongheng.com/book/(\\d+)(?:.html)?"
  ],
  "biqugese": [
    "biquge.se/(\\d+)/(\\d*)(.html)?",
    "biqugse.com/(\\d+)/(\\d*)(.html)?"
  ],
  "qiushubang": ["qiushubang.com/(\\d+)/(\\d*)(.html)?"],
  "xinshuhaige": ["xinshuhaige.com/(\\d+)/(\\d*)(.html)?"],
  "oldtimescc": ["oldtimescc.cc/go/(\\d+)/(\\d*)(.html)?"],
  "sinodan": ["sinodan.cc/view/(\\d*)(.html)?"],
  "wuwuxs": ["wuwuxs.com/\\d+_(\\d+)/(\\d*)(.html)?"],
  "hs313": ["hs313.net/book/(\\d+)/(\\d*)(.html)?"],
  "shuchong": ["shuchong.info/chapter/(\\d+)/(\\d*)(.html)?"],
  "shucw": ["shucw.com/html/\\d+/(\\d+)/(\\d*)(.html)?"],
  "shumizu": ["shumizu.com/\\d+/(\\d+)/(\\d*)(.html)?"],
  "tadu": ["tadu.com/book/(\\d+)/?(\\d*)/?"],
  "ptwxz": [
    "ptwxz.com/bookinfo/\\d+/(\\d+).html",
    "ptwxz.com/html/\\d+/(\\d+)/(\\d+).html",
    "ptwxz.com/html/\\d+/(\\d+)/"
  ],
  "x81zw": ["x81zw.com/book/\\d+/(\\d+)/(\\d*)(.html)?"],
  "linovel": ["linovel.net/book/(\\d+).html"],
  "wenku8": ["wenku8.net/novel/\\d+/(\\d+)/(\\d*).htm"],
  "youyoukanshu": [
    "youyoukanshu.com/book/(\\d+).html",
    "youyoukanshu.com/book/(\\d+)/(\\d*)(.html)?"
  ],
  "biqubao": ["biqubao.com/book/(\\d+)/(\\d*)(.html)?"],
  "biqugele": ["biqugele.com/txt/(\\d+)/(\\d*)(.html)?"],
  "biqugebz": ["biquge.bz/(\\d+)/(\\d*)(.html)?"],
  "biquge5200": ["biquge5200.cc/\\d+_(\\d+)/(\\d*)(.html)?"],
  "sfacg": [
    "sfacg.com/(?:Novel|b|i)/(\\d*)\/?",
    "sfacg.com/Novel/(\\d*)\/MainIndex/"
  ],
  "shubao45": ["shubao45.com/\\d+_(\\d+)/(\\d*)(.html)?"],

  "kujiang": ["kujiang.com/book/(\\d+)"],
  "yushubo": [
    "yushubo.com/book_(\\d+)",
    "yushubo.net/book_(\\d+)",
    "yushugu.com/book_(\\d+)",
    "yushugu.com/list_other_(\\d+)",
    "yushugu.com/read_(\\d+)_(\\d+).html"
  ],
  "xklxsw": ["xklxsw.com/book/(\\d+)/"],
  "fanqie": ["fanqienovel.com/page/(\\d+)"],
  "xsbiquge": ["xsbiquge.net/\\d+_(\\d+)/(\\d*)(.html)?"],
  //comic
  "kanman": ["kanman.com/(\\d+)/"],
  "acqq": ["https://ac.qq.com/Comic/comicInfo/id/(\\d+)"],
  "cocomanga": ["https://www.cocomanga.com/(\\d+)"],
  "colamanga": ["https://www.colamanga.com/([a-z0-9\\-]+)/"],
  "jjwxc": [
    "jjwxc.net//?onebook.php\\?novelid=(\\d+)",
    "jjwxc.net//?book2/(\\d+)/?"
  ],
  "kankeo": [
    "kankeo.cc/book/(\\d+)",
    "kankeo.cc/index/(\\d+)/"
  ],
  "qimao": ["qimao.com/shuku/(\\d+)/"],
  "ddxs": ["ddxs.com/([a-z0-9A-Z\-\_]+)/(\\d+)?"],
  "quanben5": ["quanben5.com/n/([a-z0-9A-Z\-\_]+)/"],
  "idejian": ["idejian.com/book/([0-9]+)/"]
};

function hosttest(lnk) {
  var rgx;
  var match;
  for (var hostname in hmeta) {
    for (var i = 0; i < hmeta[hostname].length; i++) {
      rgx = new RegExp(hmeta[hostname][i], 'i');
      match = rgx.exec(lnk);
      if (match != null) {
        if (typeof match[2] != "undefined" && match[2] != match[1] && /^[\d_\-]+$/.test(match[2])) {
          return {
            host: hostname,
            bookid: match[1],
            chapterid: match[2]
          }
        }
        if (typeof match[1] != "undefined") {
          return {
            host: hostname,
            bookid: match[1]
          }
        }
      }

    }
  }
  return false;
}

function goto() {
  var linkele = document.getElementById("id");
  if (!linkele) {
    linkele = document.getElementById("surf-link");
  }
  var str = linkele.value;
  if (str.indexOf(".com") < 0 && str.indexOf("http") < 0 &&
    str.indexOf(".net") < 0 &&
    str.indexOf(".cn") < 0 &&
    str.indexOf(".org") < 0 &&
    str.indexOf(".vn") < 0 &&
    str.indexOf(".us") < 0 &&
    str.indexOf(".tk") < 0 &&
    str.indexOf(".cc") < 0
  ) return dosearch(str);
  var h = hosttest(str);
  if (h != false) {
    if (isAbtHost(h.host)) {
      abtHost(h.host, h.bookid, function(bookid) {
        if (bookid !== false) {
          if ('chapterid' in h && h['chapterid'] != "") {
            location.href = "/truyen/" + h.host + "/1/" + bookid + "/" + h.chapterid + "/";
          } else {
            location.href = "/truyen/" + h.host + "/1/" + bookid + "/";
          }
        }
      });
    } else {
      if ('chapterid' in h && h['chapterid'] != "") {
        location.href = "/truyen/" + h.host + "/1/" + h.bookid + "/" + h.chapterid + "/";
      } else {
        location.href = "/truyen/" + h.host + "/1/" + h.bookid + "/";
      }
    }
  } else {
    mksurfurl(str);
  }
}

function isAbtHost(host) {
  return ["ddxs", "quanben5", "colamanga"].indexOf(host) >= 0;
}

function abtHost(host, id, calb) {
  ajax("sajax=tryaddabtrecord&host=" + host + "&abtbookid=" + id, function(d) {
    calb(/^[0-9]+$/.exec(d) ? d : false);
  });
}