(async () => {
    const res = await fetch("https://backend-worker.laoto.workers.dev/api/proxy?url=https%3A%2F%2Fmetruyenchu.com.vn%2Fmedia%2Fbook%2Ftu-zombie-tan-the-bat-dau-treo-may.jpg");
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));
})();
