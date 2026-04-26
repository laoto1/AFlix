const fs = require('fs');

const extraTranslations = {
    'player.speed': ['Speed', 'Tốc độ', '速度', '再生速度'],
    'player.subtitles': ['Subtitles', 'Phụ đề', '字幕', '字幕'],
    'player.episodes': ['Episodes', 'Tập phim', '剧集', 'エピソード'],
    'player.next_episode': ['Next Ep', 'Tập tiếp', '下一集', '次のエピソード'],
    'player.skip_intro': ['Skip Intro', 'Bỏ qua phần giới thiệu', '跳过片头', 'イントロをスキップ'],
    'player.now_playing': ['Now Playing', 'Đang phát', '正在播放', '再生中'],
    'player.source_language': ['Source & Language', 'Nguồn phát & Ngôn ngữ', '来源与语言', 'ソースとプロキシ'],
    'kkphim.filter.release_year': ['Release Year', 'Năm phát hành', '发行年份', 'リリース年'],
    'kkphim.filter.all_years': ['All Years', 'Tất cả năm', '所有年份', 'すべての年'],
    'kkphim.type.phimbo': ['Series', 'Phim Bộ', '剧集', 'ドラマ'],
    'kkphim.type.phimle': ['Movie', 'Phim Lẻ', '电影', '映画'],
};

let content = fs.readFileSync('src/contexts/SettingsContext.tsx', 'utf-8');
const langs = ['en', 'vi', 'zh', 'ja'];

const anchorValues = [
    "'history.img_not_found': 'No Img',",
    "'history.img_not_found': 'Không tìm thấy ảnh',",
    "'history.img_not_found': '没有图片',",
    "'history.img_not_found': '画像が見つかりません。',"
];

for (let i = 0; i < langs.length; i++) {
    let injectStr = '';
    
    for (const [key, trans] of Object.entries(extraTranslations)) {
        injectStr += `        '${key}': '${trans[i].replace(/'/g, "\\'")}',\n`;
    }
    
    // Find the anchor
    const anchor = anchorValues[i];
    const index = content.indexOf(anchor);
    if (index !== -1) {
        content = content.substring(0, index + anchor.length) + '\n' + injectStr + content.substring(index + anchor.length);
    }
}

fs.writeFileSync('src/contexts/SettingsContext.tsx', content);
console.log('Extra translations injected!');
