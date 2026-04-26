(async () => {
    const data = await fetch("https://backend-worker.laoto.workers.dev/api/metruyenchu?action=listing&page=1&tab=truyen-ngon-tinh-ngan").then(r => r.json());
    console.log(JSON.stringify(data.data.items.slice(0, 2), null, 2));
})();
