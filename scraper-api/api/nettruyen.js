var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_axios = __toESM(require("axios"));
var cheerio = __toESM(require("cheerio"));
const express = require("express");
const DOMAIN = "nettruyen4s.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const makeAbsoluteUrl = (url, domain) => {
  if (!url) return "";
  url = url.trim();
  const domainPrefix = `https://${domain}/https`;
  if (url.startsWith(domainPrefix)) {
    url = url.substring(`https://${domain}/`.length);
  } else if (url.startsWith(`http://${domain}/https`)) {
    url = url.substring(`http://${domain}/`.length);
  }
  if (/^\/+https?:/.test(url)) {
    url = url.replace(/^\/+/, "");
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return `https://${domain}${url}`;
  return `https://${domain}/${url}`;
};
const extractSlug = (href) => {
  const match = href.match(/\/(?:manga|truyen-tranh)\/([^/?#]+)/);
  return match ? match[1] : "";
};
const extractChapterSlug = (href) => {
  const match = href.match(/\/(?:manga|truyen-tranh)\/[^/]+\/([^/?#]+)/);
  return match ? match[1] : "";
};
const fetchPage = async (path, headers) => {
  const url = path.startsWith("http") ? path : `https://${DOMAIN}${path}`;
  const resp = await import_axios.default.get(url, {
    headers: { ...headers, Referer: `https://${DOMAIN}/` },
    timeout: 5e3
  });
  return resp.data;
};
const parseItemList = (html, domain, pageStr) => {
  const $ = cheerio.load(html);
  const items = [];
  $(".items .item, .ModuleContent .items .item").each((_, el) => {
    const linkEl = $(el).find(".image a").first();
    const href = linkEl.attr("href") || "";
    const comicSlug = extractSlug(href);
    const title = linkEl.attr("title") || $(el).find("figcaption h3 a, .jtip").text().trim();
    let thumb = $(el).find(".image img").attr("data-original") || $(el).find(".image img").attr("src") || $(el).find(".image img").attr("data-src") || "";
    thumb = makeAbsoluteUrl(thumb, domain);
    const latestChapterText = $(el).find(".comic-item li:first-child a, .chapter a").first().text().trim();
    if (comicSlug && title) {
      items.push({
        _id: comicSlug,
        name: title,
        slug: comicSlug,
        thumb_url: thumb,
        chaptersLatest: latestChapterText ? [{ chapter_name: latestChapterText }] : []
      });
    }
  });
  let totalPages = 1;
  const hiddenText = $(".pagination .hidden").text();
  if (hiddenText) {
    const match = hiddenText.match(/(?:Page|Trang)\s+\d+\s*\/\s*(\d+)/i);
    if (match) totalPages = parseInt(match[1]);
  }
  if (totalPages === 1) {
    $("ul.pagination li a").each((_, el) => {
      const num = parseInt($(el).text().trim());
      if (!isNaN(num) && num > totalPages) totalPages = num;
    });
  }
  return {
    status: "success",
    data: {
      items,
      params: {
        pagination: {
          currentPage: parseInt(pageStr),
          totalItems: totalPages * (items.length || 24),
          totalItemsPerPage: items.length || 24
        }
      }
    }
  };
};
const nettruyen = express.Router();
nettruyen.get("/", async (req, res) => {
  const { action, page = "1", slug = "", q = "", chapter = "", time = "all" } = req.query || {};
  const headers = { "User-Agent": UA };
  try {
    if (action === "latest") {
      const path = page === "1" ? `/search?sort=15` : `/search?sort=15&page=${page}`;
      const html = await fetchPage(path, headers);
      return res.json(parseItemList(html, DOMAIN, page));
    }
    if (action === "popular") {
      let sortParam = "views";
      if (time === "day") sortParam = "views_day";
      else if (time === "week") sortParam = "views_week";
      else if (time === "month") sortParam = "views_month";
      const path = page === "1" ? `/search?sort=${sortParam}` : `/search?sort=${sortParam}&page=${page}`;
      const html = await fetchPage(path, headers);
      return res.json(parseItemList(html, DOMAIN, page));
    }
    if (action === "completed") {
      const path = page === "1" ? `/search?status=2` : `/search?status=2&page=${page}`;
      const html = await fetchPage(path, headers);
      return res.json(parseItemList(html, DOMAIN, page));
    }
    if (action === "search") {
      const encodedQuery = encodeURIComponent(q);
      const path = `/search?keyword=${encodedQuery}&page=${page}`;
      const html = await fetchPage(path, headers);
      return res.json(parseItemList(html, DOMAIN, page));
    }
    if (action === "genre") {
      if (!slug) return res.json({ error: "Missing slug" });
      const path = `/the-loai/${slug}?page=${page}`;
      const html = await fetchPage(path, headers);
      return res.json(parseItemList(html, DOMAIN, page));
    }
    if (action === "detail") {
      if (!slug) return res.status(400).json({ error: "Missing slug" });
      const html = await fetchPage(`/manga/${slug}`, headers);
      const $ = cheerio.load(html);
      const title = $("h1.title-detail").text().trim() || $("article h1").text().trim();
      const altTitle = $("h2.other-name").text().trim();
      const author = $(".author .col-xs-8 a, .author p:last-child").first().text().trim() || "\u0110ang c\u1EADp nh\u1EADt";
      const status = $(".status .col-xs-8, .status p:last-child").first().text().trim() || "";
      const content = $(".detail-content p, .shortened").text().trim() || "";
      let thumb = $("#item-detail .col-image img").attr("src") || $("#item-detail .col-image img").attr("data-original") || $('meta[property="og:image"]').attr("content") || "";
      thumb = makeAbsoluteUrl(thumb, DOMAIN);
      const categories = [];
      $(".kind .col-xs-8 a, .kind p:last-child a").each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const catSlug = href.replace(/^.*\/the-loai\//, "").replace(/\/$/, "");
        if (name) categories.push({ name, slug: catSlug });
      });
      const chapters = [];
      $("nav ul .chapter a, .list-chapter li .chapter a, #nt_listchapter nav ul li .chapter a").each((_, el) => {
        const chName = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const chSlug = extractChapterSlug(href) || chName;
        let updateTime = $(el).closest("li, .row").find(".col-xs-4").text().trim();
        if (!updateTime) {
          updateTime = $(el).closest("li, .row").find(".small").first().text().trim();
        }
        if (!updateTime || updateTime === chName) {
          updateTime = "";
        }
        if (chName) {
          chapters.push({
            chapter_name: chName,
            update_time: updateTime,
            chapter_api_data: `/api/nettruyen?action=chapter&slug=${slug}&chapter=${encodeURIComponent(chSlug)}`
          });
        }
      });
      return res.json({
        status: "success",
        data: {
          item: {
            _id: slug,
            name: title,
            slug,
            thumb_url: thumb,
            origin_name: [altTitle],
            author: [author],
            status,
            content,
            category: categories,
            chapters: [{
              server_name: "Server 1",
              server_data: chapters
            }]
          }
        }
      });
    }
    if (action === "chapter") {
      if (!slug || !chapter) {
        return res.status(400).json({ error: "Missing slug or chapter" });
      }
      const html = await fetchPage(`/manga/${slug}/${chapter}`, headers);
      const $ = cheerio.load(html);
      const images = [];
      $(".reading-detail .page-chapter img, .chapter-content .page-chapter img").each((_, el) => {
        let src = $(el).attr("data-original") || $(el).attr("data-src") || $(el).attr("src") || "";
        src = makeAbsoluteUrl(src, DOMAIN);
        if (src && !src.includes("logo") && !src.includes("ads")) {
          images.push(src);
        }
      });
      return res.json({
        status: "success",
        data: {
          domain_cdn: "",
          item: {
            chapter_image: images.map((img) => ({ image_file: img }))
          }
        }
      });
    }
    if (action === "categories") {
      const html = await fetchPage("/", headers);
      const $ = cheerio.load(html);
      const categories = [];
      $(".dropdown-menu .clearfix li a, .megamenu li a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/\/the-loai\/([^/?]+)/);
        if (match) {
          categories.push({
            name: $(el).text().trim(),
            slug: match[1]
          });
        }
      });
      return res.json({ status: "success", data: { items: categories } });
    }
    return res.status(400).json({ error: "Unsupported action. Use: latest, popular, search, detail, chapter, categories" });
  } catch (error) {
    console.error("Nettruyen API Error:", error.message);
    return res.status(500).json({
      error: "Failed to scrape nettruyen. All domains may be down.",
      details: error.message
    });
  }
});
module.exports = nettruyen;
