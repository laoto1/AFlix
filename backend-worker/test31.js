(async () => {
    const res = await fetch("https://backend-worker.laoto.workers.dev/api/metruyenchu?action=listing&page=1&tab=random");
    const json = await res.json();
    console.log(JSON.stringify(json.data.items[0], null, 2));
})();
