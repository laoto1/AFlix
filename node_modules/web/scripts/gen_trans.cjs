const fs = require('fs');

const categories = {
    'hanh-dong': ['Action', 'Hành Động', '动作', 'アクション'],
    'co-trang': ['Historical', 'Cổ Trang', '古装', '時代劇'],
    'chien-tranh': ['War', 'Chiến Tranh', '战争', '戦争'],
    'vien-tuong': ['Sci-Fi', 'Viễn Tưởng', '科幻', 'SF'],
    'kinh-di': ['Horror', 'Kinh Dị', '恐怖', 'ホラー'],
    'tai-lieu': ['Documentary', 'Tài Liệu', '纪录片', 'ドキュメンタリー'],
    'bi-an': ['Mystery', 'Bí Ẩn', '悬疑', 'ミステリー'],
    'phim-18': ['18+', 'Phim 18+', '18+', '18+'],
    'tinh-cam': ['Romance', 'Tình Cảm', '爱情', 'ロマンス'],
    'tam-ly': ['Drama', 'Tâm Lý', '剧情', 'ドラマ'],
    'the-thao': ['Sports', 'Thể Thao', '体育', 'スポーツ'],
    'phieu-luu': ['Adventure', 'Phiêu Lưu', '冒险', 'アドベンチャー'],
    'am-nhac': ['Music', 'Âm Nhạc', '音乐', '音楽'],
    'gia-dinh': ['Family', 'Gia Đình', '家庭', 'ファミリー'],
    'hoc-duong': ['School', 'Học Đường', '校园', '学園'],
    'hai-huoc': ['Comedy', 'Hài Hước', '喜剧', 'コメディ'],
    'hinh-su': ['Crime', 'Hình Sự', '犯罪', '犯罪'],
    'vo-thuat': ['Martial Arts', 'Võ Thuật', '武侠', '武術'],
    'khoa-hoc': ['Science', 'Khoa Học', '科学', '科学'],
    'than-thoai': ['Mythology', 'Thần Thoại', '神话', '神話'],
    'chinh-kich': ['Drama', 'Chính Kịch', '正剧', 'ドラマ'],
    'kinh-dien': ['Classic', 'Kinh Điển', '经典', 'クラシック'],
    'phim-ngan': ['Short Film', 'Phim Ngắn', '短片', 'ショートフィルム']
};

const countries = {
    'trung-quoc': ['China', 'Trung Quốc', '中国', '中国'],
    'thai-lan': ['Thailand', 'Thái Lan', '泰国', 'タイ'],
    'hong-kong': ['Hong Kong', 'Hồng Kông', '香港', '香港'],
    'phap': ['France', 'Pháp', '法国', 'フランス'],
    'duc': ['Germany', 'Đức', '德国', 'ドイツ'],
    'ha-lan': ['Netherlands', 'Hà Lan', '荷兰', 'オランダ'],
    'mexico': ['Mexico', 'Mexico', '墨西哥', 'メキシコ'],
    'thuy-dien': ['Sweden', 'Thụy Điển', '瑞典', 'スウェーデン'],
    'philippines': ['Philippines', 'Philippines', '菲律宾', 'フィリピン'],
    'dan-mach': ['Denmark', 'Đan Mạch', '丹麦', 'デンマーク'],
    'thuy-si': ['Switzerland', 'Thụy Sĩ', '瑞士', 'スイス'],
    'ukraina': ['Ukraine', 'Ukraina', '乌克兰', 'ウクライナ'],
    'han-quoc': ['South Korea', 'Hàn Quốc', '韩国', '韓国'],
    'au-my': ['Europe & US', 'Âu Mỹ', '欧美', '欧米'],
    'an-do': ['India', 'Ấn Độ', '印度', 'インド'],
    'canada': ['Canada', 'Canada', '加拿大', 'カナダ'],
    'tay-ban-nha': ['Spain', 'Tây Ban Nha', '西班牙', 'スペイン'],
    'indonesia': ['Indonesia', 'Indonesia', '印尼', 'インドネ西亚'],
    'ba-lan': ['Poland', 'Ba Lan', '波兰', 'ポーランド'],
    'malaysia': ['Malaysia', 'Malaysia', '马来西亚', 'マレーシア'],
    'bo-dao-nha': ['Portugal', 'Bồ Đào Nha', '葡萄牙', 'ポルトガル'],
    'uae': ['UAE', 'UAE', '阿联酋', 'UAE'],
    'chau-phi': ['Africa', 'Châu Phi', '非洲', 'アフリカ'],
    'a-rap-xe-ut': ['Saudi Arabia', 'Ả Rập Xê Út', '沙特阿拉伯', 'サウジアラビア'],
    'nhat-ban': ['Japan', 'Nhật Bản', '日本', '日本'],
    'dai-loan': ['Taiwan', 'Đài Loan', '台湾', '台湾'],
    'anh': ['UK', 'Anh', '英国', 'イギリス'],
    'tho-nhi-ky': ['Turkey', 'Thổ Nhĩ Kỳ', '土耳其', 'トルコ'],
    'nga': ['Russia', 'Nga', '俄罗斯', 'ロシア'],
    'uc': ['Australia', 'Úc', '澳大利亚', 'オーストラリア'],
    'brazil': ['Brazil', 'Brazil', '巴西', 'ブラジル'],
    'y': ['Italy', 'Ý', '意大利', 'イタリア'],
    'na-uy': ['Norway', 'Na Uy', '挪威', 'ノルウェー'],
    'nam-phi': ['South Africa', 'Nam Phi', '南非', '南アフリカ'],
    'viet-nam': ['Vietnam', 'Việt Nam', '越南', 'ベトナム'],
    'quoc-gia-khac': ['Other', 'Quốc Gia Khác', '其他', 'その他']
};

let content = fs.readFileSync('src/contexts/SettingsContext.tsx', 'utf-8');
const langs = ['en', 'vi', 'zh', 'ja'];

for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    let injectStr = '';
    for (const [slug, trans] of Object.entries(categories)) {
        injectStr += `        'kkphim.category.${slug}': '${trans[i].replace(/'/g, "\\'")}',\n`;
    }
    for (const [slug, trans] of Object.entries(countries)) {
        injectStr += `        'kkphim.country.${slug}': '${trans[i].replace(/'/g, "\\'")}',\n`;
    }
    
    // Find where the lang object is
    const langIndex = content.indexOf(`    ${lang}: {`);
    const nextLangIndex = i < langs.length - 1 ? content.indexOf(`    ${langs[i+1]}: {`) : content.length;
    
    // Within this range, find the last `    },`
    const chunk = content.substring(langIndex, nextLangIndex);
    const lastClosingBrace = chunk.lastIndexOf('    },');
    if (lastClosingBrace !== -1) {
        const newChunk = chunk.substring(0, lastClosingBrace) + injectStr + chunk.substring(lastClosingBrace);
        content = content.substring(0, langIndex) + newChunk + content.substring(nextLangIndex);
    } else {
        // Last one doesn't have a trailing comma
        const lastClosingBrace2 = chunk.lastIndexOf('    }');
        const newChunk = chunk.substring(0, lastClosingBrace2) + injectStr + chunk.substring(lastClosingBrace2);
        content = content.substring(0, langIndex) + newChunk + content.substring(nextLangIndex);
    }
}

fs.writeFileSync('src/contexts/SettingsContext.tsx', content);
console.log('done');
