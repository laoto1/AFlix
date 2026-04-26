const fs = require('fs');

let searchContent = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

searchContent = searchContent.replace(
    /getNextPageParam: \(lastPage\) => \{\s*const \{ currentPage, totalItems, totalItemsPerPage \} = lastPage\.data\.params\.pagination;\s*const totalPages = Math\.ceil\(totalItems \/ totalItemsPerPage\);\s*return currentPage < totalPages \? currentPage \+ 1 : undefined;\s*\}/,
    `getNextPageParam: (lastPage) => {
            const pagination = lastPage.data?.pagination || lastPage.data?.params?.pagination;
            if (!pagination) return undefined;
            const { currentPage, totalItems, totalItemsPerPage, totalPages: apiTotalPages } = pagination;
            const totalPages = apiTotalPages || Math.ceil(totalItems / totalItemsPerPage);
            return currentPage < totalPages ? currentPage + 1 : undefined;
        }`
);

fs.writeFileSync('src/pages/Search.tsx', searchContent);
console.log('Fixed getNextPageParam in Search.tsx');
