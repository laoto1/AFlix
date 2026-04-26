const fs = require('fs');

const baseTranslations = {
    'mtc.tabs.latest': ['Latest', 'Mới nhất', '最新', '最新'],
    'mtc.tabs.hot': ['Hot', 'Truyện hot', '热门', 'ホット'],
    'mtc.tabs.completed': ['Completed', 'Hoàn thành', '完结', '完結済'],
    'mtc.tabs.curated': ['Curated', 'Chọn lọc', '精选', '厳選'],
    'mtc.tabs.random': ['Random', 'Ngẫu nhiên', '随机', 'ランダム'],
    'mtc.tabs.popular': ['Popular', 'Phổ biến', '流行', '人気'],
    'mtc.sort.viewday': ['Current', 'Hiện tại', '当前', '現在'],
    'mtc.sort.viewweek': ['This Week', 'Trong tuần', '本周', '今週'],
    'mtc.sort.view': ['All Time', 'Toàn bộ', '全部', '全期間'],
    'mtc.sort.like': ['Likes', 'Lượt thích', '点赞', 'いいね'],
    'mtc.sort.following': ['Following', 'Theo dõi', '关注', 'フォロー'],
    'mtc.sort.bookmarked': ['Bookmarked', 'Đánh dấu', '收藏', 'ブックマーク'],
    'kkphim.filter.all': ['All', 'Tất cả', '全部', 'すべて'],
    'kkphim.filter.all_genres': ['All Genres', 'Tất cả thể loại', '全部类型', 'すべてのジャンル'],
    'kkphim.filter.all_countries': ['All Countries', 'Tất cả quốc gia', '全部国家', 'すべての国'],
    'kkphim.filter.type': ['Type', 'Loại phim', '类型', 'タイプ'],
    'kkphim.filter.sort': ['Sort By', 'Sắp xếp theo', '排序', '並べ替え'],
    'kkphim.filter.country': ['Country', 'Quốc gia', '国家', '国'],
    'kkphim.type.series': ['Series', 'Phim Bộ', '剧集', 'ドラマ'],
    'kkphim.type.single': ['Movie', 'Phim Lẻ', '电影', '映画'],
    'kkphim.type.hoathinh': ['Animation', 'Hoạt Hình', '动画', 'アニメ'],
    'kkphim.type.tvshows': ['TV Shows', 'TV Shows', '综艺', 'テレビ番組'],
    'kkphim.sort.update': ['Recently Updated', 'Mới cập nhật', '最近更新', '最近の更新'],
    'kkphim.sort.year': ['Release Year', 'Năm sản xuất', '发行年份', 'リリース年'],
    'kkphim.sort.new': ['Newly Added', 'Mới đăng', '新添加', '新着'],
    'movie.watch_now': ['Watch Now', 'Xem Ngay', '立即观看', '今すぐ見る'],
    'movie.watch_trailer': ['Watch Trailer', 'Xem Trailer', '观看预告片', '予告編を見る'],
    'movie.synopsis': ['Synopsis', 'Nội dung phim', '剧情简介', 'あらすじ'],
    'movie.episode_list': ['Episode List', 'Danh Sách Tập', '剧集列表', 'エピソードリスト']
};

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

const anchorValues = [
    "'history.img_not_found': 'No Img',",
    "'history.img_not_found': 'Không tìm thấy ảnh',",
    "'history.img_not_found': '没有图片',",
    "'history.img_not_found': '画像が見つかりません。',"
];

for (let i = 0; i < langs.length; i++) {
    let injectStr = '';
    
    for (const [key, trans] of Object.entries(baseTranslations)) {
        injectStr += `        '${key}': '${trans[i].replace(/'/g, "\\'")}',\n`;
    }
    for (const [slug, trans] of Object.entries(categories)) {
        injectStr += `        'kkphim.category.${slug}': '${trans[i].replace(/'/g, "\\'")}',\n`;
    }
    for (const [slug, trans] of Object.entries(countries)) {
        injectStr += `        'kkphim.country.${slug}': '${trans[i].replace(/'/g, "\\'")}',\n`;
    }
    
    // Find the anchor
    const anchor = anchorValues[i];
    const index = content.indexOf(anchor);
    if (index !== -1) {
        content = content.substring(0, index + anchor.length) + '\n' + injectStr + content.substring(index + anchor.length);
    }
}

fs.writeFileSync('src/contexts/SettingsContext.tsx', content);
console.log('Translations successfully injected into SettingsContext.tsx!');
