const fs = require('fs');

// 1. KKPhimCard.tsx
let kkphimCard = fs.readFileSync('src/components/KKPhimCard.tsx', 'utf-8');

if (!kkphimCard.includes('import { useSettings }')) {
    kkphimCard = kkphimCard.replace(
        "import * as KKPhimService from '../services/kkphim';",
        "import * as KKPhimService from '../services/kkphim';\nimport { useSettings } from '../contexts/SettingsContext';"
    );
}

if (!kkphimCard.includes('const { t } = useSettings();')) {
    kkphimCard = kkphimCard.replace(
        "export const KKPhimCard: React.FC<KKPhimCardProps> = ({ movie: initialMovie, sourceId }) => {",
        "export const KKPhimCard: React.FC<KKPhimCardProps> = ({ movie: initialMovie, sourceId }) => {\n    const { t } = useSettings();"
    );
}

kkphimCard = kkphimCard.replace(
    /{countries\[0\]\.name}/g,
    "{countries[0].slug ? (t(`kkphim.country.${countries[0].slug}`) === `kkphim.country.${countries[0].slug}` ? countries[0].name : t(`kkphim.country.${countries[0].slug}`)) : countries[0].name}"
);

kkphimCard = kkphimCard.replace(
    /const catName = cat\.name \|\| cat;/g,
    "const catName = cat.slug ? (t(`kkphim.category.${cat.slug}`) === `kkphim.category.${cat.slug}` ? cat.name : t(`kkphim.category.${cat.slug}`)) : (cat.name || cat);"
);

kkphimCard = kkphimCard.replace(
    /<h3 className="text-white text-sm md:text-base font-extrabold line-clamp-1 drop-shadow-md">\{movie\.name\}<\/h3>\s*<p className="text-\[var\(--color-text-muted\)\] text-\[10px\] md:text-\[12px\] font-medium line-clamp-1 truncate block drop-shadow-md">\{movie\.origin_name\}<\/p>/g,
    `<h3 className="text-white text-sm md:text-base font-extrabold line-clamp-1 drop-shadow-md">{movie.origin_name && t('nav.home') !== 'Trang chủ' ? movie.origin_name : movie.name}</h3>
                <p className="text-[var(--color-text-muted)] text-[10px] md:text-[12px] font-medium line-clamp-1 truncate block drop-shadow-md">{movie.origin_name && t('nav.home') !== 'Trang chủ' ? movie.name : movie.origin_name}</p>`
);

fs.writeFileSync('src/components/KKPhimCard.tsx', kkphimCard);

// 2. NetflixPlayer.tsx
let netflixPlayer = fs.readFileSync('src/components/NetflixPlayer.tsx', 'utf-8');

if (!netflixPlayer.includes('import { useSettings }')) {
    netflixPlayer = netflixPlayer.replace(
        "import { getProxiedImageUrl } from '../utils/imageProxy';",
        "import { getProxiedImageUrl } from '../utils/imageProxy';\nimport { useSettings } from '../contexts/SettingsContext';"
    );
}

if (!netflixPlayer.includes('const { t } = useSettings();')) {
    netflixPlayer = netflixPlayer.replace(
        "export const NetflixPlayer: React.FC<NetflixPlayerProps> = ({",
        "export const NetflixPlayer: React.FC<NetflixPlayerProps> = ({\n"
    );
    netflixPlayer = netflixPlayer.replace(
        "}) => {\n    const containerRef = useRef<HTMLDivElement>(null);",
        "}) => {\n    const { t } = useSettings();\n    const containerRef = useRef<HTMLDivElement>(null);"
    );
}

netflixPlayer = netflixPlayer.replace(
    /<span>Tốc độ \(\{playbackSpeed\}x\)<\/span>/g,
    "<span>{t('player.speed')} ({playbackSpeed}x)</span>"
);

netflixPlayer = netflixPlayer.replace(
    /<span>Phụ đề<\/span>/g,
    "<span>{t('player.subtitles')}</span>"
);

netflixPlayer = netflixPlayer.replace(
    /<span>Tập phim<\/span>/g,
    "<span>{t('player.episodes')}</span>"
);

netflixPlayer = netflixPlayer.replace(
    /<span>Tập tiếp<\/span>/g,
    "<span>{t('player.next_episode')}</span>"
);

netflixPlayer = netflixPlayer.replace(
    /Danh Sách Tập/g,
    "{t('movie.episode_list')}"
);

netflixPlayer = netflixPlayer.replace(
    /Nguồn phát & Ngôn ngữ/g,
    "{t('player.source_language')}"
);

netflixPlayer = netflixPlayer.replace(
    /Đang phát/g,
    "{t('player.now_playing')}"
);

netflixPlayer = netflixPlayer.replace(
    /Bỏ qua phần giới thiệu/g,
    "{t('player.skip_intro')}"
);

fs.writeFileSync('src/components/NetflixPlayer.tsx', netflixPlayer);

console.log('Fixed KKPhimCard and NetflixPlayer');
