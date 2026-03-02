import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'vi' | 'zh' | 'ja';
export type Theme = 'dark' | 'light';
export type AccentColor = '#f97316' | '#3b82f6' | '#10b981' | '#8b5cf6' | '#ef4444';

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const SETTINGS_STORAGE_KEY = 'flix_settings';

const translations: Record<Language, Record<string, string>> = {
    en: {
        'nav.home': 'Home',
        'nav.library': 'Library',
        'nav.search': 'Search',
        'nav.downloads': 'Downloads',
        'nav.history': 'History',
        'nav.settings': 'Settings',
        'nav.manga': 'Manga',
        'nav.novel': 'Novel',
        'nav.movie': 'Movie',
        'settings.account': 'Account',
        'settings.logged_in': 'Logged in',
        'settings.edit_profile': 'Edit Profile',
        'settings.appearance': 'Appearance',
        'settings.theme': 'Theme',
        'settings.theme.dark': 'Dark',
        'settings.theme.light': 'Light',
        'settings.accent_color': 'Accent Color',
        'settings.language': 'Language',
        'settings.about': 'About',
        'settings.version': 'Version',
        'settings.logout': 'Logout',
        'settings.unlock.placeholder': 'Enter passcode...',
        'settings.unlock.verify': 'Verify',
        'settings.unlock.success': 'Source unlocked!',
        'settings.unlock.fail': 'Invalid key',
        'search.placeholder': 'Search comics...',
        'search.type_more': 'Type at least 3 characters...',
        'search.no_results': 'No results found for "{query}"',
        'search.error': 'Error searching.',
        'search.genres': 'Genres',
        'search.nhentai.tags': 'Tags',
        'search.nhentai.artists': 'Artists',
        'search.nhentai.characters': 'Characters',
        'search.nhentai.parodies': 'Parodies',
        'search.nhentai.groups': 'Groups',
        'source.latest': 'Last Updates',
        'source.popular': 'Popular',
        'source.popular_current': 'Current',
        'source.popular_today': 'Today',
        'source.popular_week': 'This Week',
        'source.popular_month': 'This Month',
        'source.popular_all': 'All Time',
        'source.completed': 'Completed',
        'source.unsupported': 'Source "{source}" not supported currently.',
        'source.error': 'Error loading data.',
        'source.list_title': '{source} List',

        'profile.edit_title': 'Edit Profile',
        'profile.save': 'Save',
        'profile.display_name': 'Display Name',
        'profile.bio': 'Bio',
        'profile.bio_placeholder': 'Tell us about yourself...',
        'profile.upload_success': 'Image uploaded successfully!',
        'profile.upload_failed': 'Failed to upload image.',
        'profile.save_success': 'Profile successfully updated!',
        'profile.save_failed': 'Failed to save profile.',
        'profile.crop_title': 'Edit Image',
        'profile.crop_zoom_out': 'Zoom out',
        'profile.crop_zoom_in': 'Zoom in',
        'profile.crop_done': 'Done',
        'profile.no_frame': 'NONE',
        'profile.no_cover': 'NONE',

        'downloads.clear_all': 'Clear All',
        'downloads.pause_all': 'Pause All',
        'downloads.resume': 'Resume ({count})',
        'downloads.start': 'Start ({count})',
        'downloads.no_downloads': 'No downloads in queue.',
        'downloads.queue': 'Queue',
        'downloads.completed': 'Completed',
        'downloads.clear_history': 'Clear History',
        'comic.chapters': 'Chapters',
        'comic.total': '{count} total',
        'comic.download_all': 'Download All (ZIP)',
        'comic.queue_all': 'Queue All',
        'comic.read': 'Read',
        'chapters.downloading': 'Downloading...',
        'chapters.completed': 'Done',
        'chapters.pending': 'Pending',
        'chapters.paused': 'Paused',
        'chapters.failed': 'Failed',

        // Reader Settings
        'reader.settings.mode': 'Reading Mode',
        'reader.settings.general': 'General',
        'reader.settings.filters': 'Custom Filters',
        'reader.settings.reading_mode': 'Reading Mode',
        'reader.mode.default': 'Default',
        'reader.mode.paged': 'Paged (L to R)',
        'reader.mode.webtoon': 'Vertical Scroll',
        'reader.settings.tap_zone': 'Tap Zone',
        'reader.tap.default': 'Default',
        'reader.tap.l_shape': 'L-Shape',
        'reader.tap.kindle': 'Kindle-like',
        'reader.tap.off': 'Off',
        'reader.settings.invert_tap': 'Invert Tap Zones',
        'reader.invert.none': 'None',
        'reader.invert.horizontal': 'Horizontal',
        'reader.invert.vertical': 'Vertical',
        'reader.invert.both': 'Both',
        'reader.settings.side_padding': 'Side Padding',
        'reader.settings.auto_scroll': 'Auto-scroll Speed',
        'reader.settings.auto_scroll_level': 'Level {level}',
        'reader.settings.double_tap_zoom': 'Double tap to zoom',
        'reader.settings.bg_color': 'Background Color',
        'reader.bg.black': 'Black',
        'reader.bg.gray': 'Gray',
        'reader.bg.white': 'White',
        'reader.settings.show_page': 'Show Page Number',
        'reader.settings.fullscreen': 'Fullscreen',
        'reader.settings.custom_brightness': 'Custom Brightness',
        'reader.settings.grayscale': 'Grayscale',
        'reader.settings.invert_colors': 'Invert Colors',
        'reader.settings.crop_borders': 'Crop Borders',
        'reader.settings.split_double_pages': 'Split Double Pages',

        // Misc
        'reader.chapter': 'Chapter {number}',
        'comic.continue_reading': 'Continue Reading',
        'comic.start_reading': 'Start Reading',
        'comic.latest_chapter': 'Latest Chapter',
        'comic.author': 'Author',
        'comic.status': 'Status',
        'comic.status.ongoing': 'Ongoing',
        'comic.status.completed': 'Completed',
        // Comic Detail Modals
        'comic.filter': 'Filter',
        'comic.sort': 'Sort',
        'comic.display': 'Display',
        'comic.filter.downloaded': 'Downloaded',
        'comic.filter.unread': 'Unread',
        'comic.filter.bookmarked': 'Bookmarked',
        'comic.sort.source': 'By Source Name / Alphabetical',
        'comic.sort.chapter': 'By Chapter Number',
        'comic.sort.date': 'By Upload Date (API not supported)',
        'comic.display.source': 'Source Title',
        'comic.display.chapter': 'Chapter Number',
        'comic.added_queue': 'Added all to queue',
        'comic.added_zip_queue': 'Added entire comic (ZIP) to download queue!',
        'comic.added_chapter': 'Added Chapter {number}',
        'comic.added_chapter_queue': 'Added Chapter {number} to download progress',
        'comic.no_chapters': 'No chapters',
        'comic.queue_count': 'Scheduled {count} chapters for download',
        'comic.mark_read': 'Mark Read',
        'comic.mark_unread': 'Mark Unread',
        'comic.mark_read_down': 'Mark Read Down',
        'comic.bookmark': 'Bookmark',
        'comic.add_queue': 'Add to Queue',
        'comic.download_now': 'Download Now',

        // Home & Library
        'home.browse': 'Browse Sources',
        'home.latest': 'LATEST',
        'home.coming_soon': 'Coming soon in future updates.',
        'library.title': 'Library',
        'library.empty': 'Your library is empty.',
        'library.browse': 'Browse Comics',
        'library.failed': 'Failed to load library.',

        //History
        'history.empty': 'No reading history yet.',
        'history.failed': 'Failed to load history.',
        'history.img_not_found': 'No Img',
    },
    vi: {
        'nav.home': 'Trang chủ',
        'nav.library': 'Thư viện',
        'nav.search': 'Tìm kiếm',
        'nav.downloads': 'Tải xuống',
        'nav.history': 'Lịch sử',
        'nav.settings': 'Cài đặt',
        'nav.manga': 'Truyện tranh',
        'nav.novel': 'Tiểu thuyết',
        'nav.movie': 'Phim',
        'settings.account': 'Tài khoản',
        'settings.logged_in': 'Đã đăng nhập',
        'settings.edit_profile': 'Chỉnh sửa hồ sơ',
        'settings.appearance': 'Giao diện',
        'settings.theme': 'Chủ đề',
        'settings.theme.dark': 'Tối',
        'settings.theme.light': 'Sáng',
        'settings.accent_color': 'Màu nhấn',
        'settings.language': 'Ngôn ngữ',
        'settings.about': 'Thông tin',
        'settings.version': 'Phiên bản',
        'settings.logout': 'Đăng xuất',
        'settings.unlock.placeholder': 'Nhập mã bí mật...',
        'settings.unlock.verify': 'Xác thực',
        'settings.unlock.success': 'Đã mở khoá nguồn truyện!',
        'settings.unlock.fail': 'Mã không hợp lệ',
        'search.placeholder': 'Tìm kiếm truyện...',
        'search.type_more': 'Nhập ít nhất 3 ký tự...',
        'search.no_results': 'Không tìm thấy kết quả cho "{query}"',
        'search.error': 'Lỗi tìm kiếm.',
        'search.genres': 'Thể loại',
        'search.nhentai.tags': 'Thể loại',
        'search.nhentai.artists': 'Tác giả',
        'search.nhentai.characters': 'Nhân vật',
        'search.nhentai.parodies': 'Đồng nhân',
        'search.nhentai.groups': 'Nhóm',
        'source.latest': 'Mới nhất',
        'source.popular': 'Phổ biến',
        'source.popular_current': 'Hiện tại',
        'source.popular_today': 'Trong ngày',
        'source.popular_week': 'Trong tuần',
        'source.popular_month': 'Trong tháng',
        'source.popular_all': 'Toàn bộ',
        'source.completed': 'Hoàn thành',
        'source.unsupported': 'Nguồn "{source}" hiện không được hỗ trợ.',
        'source.error': 'Lỗi tải dữ liệu.',
        'source.list_title': 'Danh sách {source}',

        'profile.edit_title': 'Chỉnh sửa hồ sơ',
        'profile.save': 'Lưu',
        'profile.display_name': 'Tên hiển thị',
        'profile.bio': 'Tiểu sử',
        'profile.bio_placeholder': 'Chia sẻ điều gì đó về bạn...',
        'profile.upload_success': 'Tải ảnh thành công!',
        'profile.upload_failed': 'Tải ảnh thất bại.',
        'profile.save_success': 'Cập nhật hồ sơ thành công!',
        'profile.save_failed': 'Lưu hồ sơ thất bại.',
        'profile.crop_title': 'Chỉnh sửa ảnh',
        'profile.crop_zoom_out': 'Thu nhỏ',
        'profile.crop_zoom_in': 'Phóng to',
        'profile.crop_done': 'Xong',
        'profile.no_frame': 'KHÔNG CÓ',
        'profile.no_cover': 'KHÔNG CÓ',

        'downloads.clear_all': 'Xóa tất cả',
        'downloads.pause_all': 'Dừng tất cả',
        'downloads.resume': 'Tiếp tục ({count})',
        'downloads.start': 'Bắt đầu ({count})',
        'downloads.no_downloads': 'Không có tải xuống nào.',
        'downloads.queue': 'Hàng đợi',
        'downloads.completed': 'Đã hoàn thành',
        'downloads.clear_history': 'Xóa lịch sử',
        'comic.chapters': 'Danh sách chương',
        'comic.total': 'Tổng {count}',
        'comic.download_all': 'Tải bộ truyện (ZIP)',
        'comic.queue_all': 'Thêm tất cả vào hàng chờ',
        'comic.read': 'Đọc',
        'chapters.downloading': 'Đang tải...',
        'chapters.completed': 'Xong',
        'chapters.pending': 'Chờ tải',
        'chapters.paused': 'Đã dừng',
        'chapters.failed': 'Lỗi',

        // Reader Settings
        'reader.settings.mode': 'Kiểu đọc',
        'reader.settings.general': 'Chung',
        'reader.settings.filters': 'Bộ lọc tùy chỉnh',
        'reader.settings.reading_mode': 'Kiểu đọc',
        'reader.mode.default': 'Mặc định',
        'reader.mode.paged': 'Trang sách',
        'reader.mode.webtoon': 'Cuộn dọc',
        'reader.settings.tap_zone': 'Khu vực nhấn',
        'reader.tap.default': 'Mặc định',
        'reader.tap.l_shape': 'Dạng chữ L',
        'reader.tap.kindle': 'Dạng giống Kindle',
        'reader.tap.off': 'Tắt',
        'reader.settings.invert_tap': 'Đảo ngược khu vực nhấn',
        'reader.invert.none': 'Không',
        'reader.invert.horizontal': 'Ngang',
        'reader.invert.vertical': 'Dọc',
        'reader.invert.both': 'Cả hai',
        'reader.settings.side_padding': 'Kích cỡ hai bên',
        'reader.settings.auto_scroll': 'Tốc độ cuộn tự động',
        'reader.settings.auto_scroll_level': 'Mức {level}',
        'reader.settings.double_tap_zoom': 'Nhấn đúp để phóng to',
        'reader.settings.bg_color': 'Màu nền',
        'reader.bg.black': 'Đen',
        'reader.bg.gray': 'Xám',
        'reader.bg.white': 'Trắng',
        'reader.settings.show_page': 'Hiện số trang',
        'reader.settings.fullscreen': 'Toàn màn hình',
        'reader.settings.custom_brightness': 'Độ sáng tùy chỉnh',
        'reader.settings.grayscale': 'Ảnh đen trắng',
        'reader.settings.invert_colors': 'Đảo màu',
        'reader.settings.crop_borders': 'Cắt viền',
        'reader.settings.split_double_pages': 'Chia các trang đôi',

        // Misc
        'reader.chapter': 'Chương {number}',
        'comic.continue_reading': 'Đọc tiếp',
        'comic.start_reading': 'Bắt đầu đọc',
        'comic.latest_chapter': 'Chương mới nhất',
        'comic.author': 'Tác giả',
        'comic.status': 'Trạng thái',
        'comic.status.ongoing': 'Đang ra',
        'comic.status.completed': 'Hoàn thành',
        // Comic Detail Modals
        'comic.filter': 'Bộ lọc',
        'comic.sort': 'Sắp xếp',
        'comic.display': 'Hiển thị',
        'comic.filter.downloaded': 'Đã tải xuống',
        'comic.filter.unread': 'Chưa đọc',
        'comic.filter.bookmarked': 'Đã đánh dấu',
        'comic.sort.source': 'Theo nguồn truyện / Bảng chữ cái',
        'comic.sort.chapter': 'Theo số chương',
        'comic.sort.date': 'Bởi ngày đăng (API không hỗ trợ)',
        'comic.display.source': 'Tiêu đề nguồn',
        'comic.display.chapter': 'Số chương',
        'comic.added_queue': 'Đã thêm toàn bộ vào hàng chờ',
        'comic.added_zip_queue': 'Đã thêm toàn bộ truyện (ZIP) vào hàng tải!',
        'comic.added_chapter': 'Đã thêm Chapter {number}',
        'comic.added_chapter_queue': 'Đã thêm Chapter {number} vào tiến trình tải',
        'comic.no_chapters': 'Chưa có chương',
        'comic.queue_count': 'Đã xếp lịch tải {count} chapter',
        'comic.mark_read': 'Đã đọc',
        'comic.mark_unread': 'Chưa đọc',
        'comic.mark_read_down': 'Đã đọc xuống',
        'comic.bookmark': 'Đánh dấu',
        'comic.add_queue': 'Thêm hàng chờ',
        'comic.download_now': 'Tải về ngay',

        // Home & Library
        'home.browse': 'Khám phá Nguồn',
        'home.latest': 'MỚI NHẤT',
        'home.coming_soon': 'Sắp ra mắt trong các bản cập nhật tới.',
        'library.title': 'Thư viện',
        'library.empty': 'Thư viện của bạn đang trống.',
        'library.browse': 'Khám phá Truyện',
        'library.failed': 'Tải thư viện thất bại.',

        //History
        'history.empty': 'Bạn chưa có lịch sử đọc truyện.',
        'history.failed': 'Tải lịch sử đọc truyện thất bại.',
        'history.img_not_found': 'Không tìm thấy ảnh',
    },
    zh: {
        'nav.home': '首页',
        'nav.library': '书架',
        'nav.search': '搜索',
        'nav.downloads': '下载',
        'nav.history': '历史',
        'nav.settings': '设置',
        'nav.manga': '漫画',
        'nav.novel': '小说',
        'nav.movie': '电影',
        'settings.account': '账户',
        'settings.logged_in': '已登录',
        'settings.edit_profile': '编辑资料',
        'settings.appearance': '外观',
        'settings.theme': '主题',
        'settings.theme.dark': '暗黑',
        'settings.theme.light': '明亮',
        'settings.accent_color': '强调色',
        'settings.language': '语言',
        'settings.about': '关于',
        'settings.version': '版本',
        'settings.logout': '退出登录',
        'settings.unlock.placeholder': '输入密码...',
        'settings.unlock.verify': '验证',
        'settings.unlock.success': '源码已解锁！',
        'settings.unlock.fail': '无效密钥',
        'search.placeholder': '搜索漫画...',
        'search.type_more': '输入至少3个字符...',
        'search.no_results': '未找到 "{query}" 的结果',
        'search.error': '搜索失败。',
        'search.genres': '类型',
        'search.nhentai.tags': '标签',
        'search.nhentai.artists': '作者',
        'search.nhentai.characters': '角色',
        'search.nhentai.parodies': '同人',
        'search.nhentai.groups': '团队',
        'source.latest': '最新更新',
        'source.popular': '最受欢迎',
        'source.popular_current': '当前',
        'source.popular_today': '今天',
        'source.popular_week': '本周',
        'source.popular_month': '本月',
        'source.popular_all': '全部',
        'source.completed': '已完结',
        'source.unsupported': '当前不支持源 "{source}"。',
        'source.error': '加载数据失败。',
        'source.list_title': '{source} 列表',

        'profile.edit_title': '编辑资料',
        'profile.save': '保存',
        'profile.display_name': '显示名称',
        'profile.bio': '简介',
        'profile.bio_placeholder': '介绍一下你自己...',
        'profile.upload_success': '图片上传成功！',
        'profile.upload_failed': '上传图片失败。',
        'profile.save_success': '个人资料已更新！',
        'profile.save_failed': '保存资料失败。',
        'profile.crop_title': '编辑图片',
        'profile.crop_zoom_out': '缩小',
        'profile.crop_zoom_in': '放大',
        'profile.crop_done': '完成',
        'profile.no_frame': '无',
        'profile.no_cover': '无',

        'downloads.clear_all': '全部清除',
        'downloads.pause_all': '全部暂停',
        'downloads.resume': '恢复 ({count})',
        'downloads.start': '开始 ({count})',
        'downloads.no_downloads': '队列中没有下载任务。',
        'downloads.queue': '下载队列',
        'downloads.completed': '已完成',
        'downloads.clear_history': '清除历史',

        // Comic Detail Modals
        'comic.filter': '筛选',
        'comic.sort': '排序',
        'comic.display': '显示',
        'comic.filter.downloaded': '已下载',
        'comic.filter.unread': '未读',
        'comic.filter.bookmarked': '已收藏',
        'comic.sort.source': '按源名称 / 字母顺序',
        'comic.sort.chapter': '按章节数',
        'comic.sort.date': '按更新日期 (API不支持)',
        'comic.display.source': '源标题',
        'comic.display.chapter': '章节号',
        'comic.added_queue': '已全部加入队列',
        'comic.added_zip_queue': '已将全本(ZIP)加入下载进度!',
        'comic.added_chapter': '已添加第 {number} 章',
        'comic.added_chapter_queue': '已将第 {number} 章加入下载进度',
        'comic.no_chapters': '暂无章节',
        'comic.queue_count': '已预约下载 {count} 章',
        'comic.mark_read': '标记为已读',
        'comic.mark_unread': '标记为未读',
        'comic.mark_read_down': '向下标记已读',
        'comic.bookmark': '收藏',
        'comic.add_queue': '加入队列',
        'comic.download_now': '立即下载',

        'comic.chapters': '章节',
        'comic.total': '共 {count} 章',
        'comic.download_all': '下载全部 (ZIP)',
        'comic.queue_all': '全部加入队列',
        'comic.read': '阅读',
        'chapters.downloading': '下载中...',
        'chapters.completed': '完成',
        'chapters.pending': '等待中',
        'chapters.paused': '已暂停',
        'chapters.failed': '失败',
        'comic.author': '作者',
        'comic.status': '状态',
        'comic.status.ongoing': '连载中',
        'comic.status.completed': '已完结',

        // Home & Library
        'home.browse': '浏览源',
        'home.latest': '最新',
        'home.coming_soon': '即将在未来的更新中推出。',
        'library.title': '书架',
        'library.empty': '您的书架是空的。',
        'library.browse': '浏览漫画',
        'library.failed': '加载书架失败。',

        //History
        'history.empty': '您还没有阅读历史。',
        'history.failed': '加载阅读历史失败。',
        'history.img_not_found': '没有图片',
    },
    ja: {
        'nav.home': 'ホーム',
        'nav.library': 'ライブラリ',
        'nav.search': '検索',
        'nav.downloads': 'ダウンロード',
        'nav.history': '履歴',
        'nav.settings': '設定',
        'nav.manga': 'マンガ',
        'nav.novel': '小説',
        'nav.movie': '映画',
        'settings.account': 'アカウント',
        'settings.logged_in': 'ログイン済み',
        'settings.edit_profile': 'プロフィール編集',
        'settings.appearance': '外観',
        'settings.theme': 'テーマ',
        'settings.theme.dark': 'ダーク',
        'settings.theme.light': 'ライト',
        'settings.accent_color': 'アクセントカラー',
        'settings.language': '言語',
        'settings.about': 'アプリについて',
        'settings.version': 'バージョン',
        'settings.logout': 'ログアウト',
        'settings.unlock.placeholder': 'パスコードを入力...',
        'settings.unlock.verify': '確認',
        'settings.unlock.success': 'ソースがロック解除されました！',
        'settings.unlock.fail': '無効なキーです',
        'search.placeholder': '漫画を検索...',
        'search.type_more': '3文字以上入力してください...',
        'search.no_results': '"{query}" の結果が見つかりません',
        'search.error': '検索エラー。',
        'search.genres': 'ジャンル',
        'search.nhentai.tags': 'タグ',
        'search.nhentai.artists': '作者',
        'search.nhentai.characters': 'キャラクター',
        'search.nhentai.parodies': 'パロディ',
        'search.nhentai.groups': 'グループ',
        'source.latest': '最新の更新',
        'source.popular': '人気',
        'source.popular_current': '現在',
        'source.popular_today': '今日',
        'source.popular_week': '今週',
        'source.popular_month': '今月',
        'source.popular_all': '全期間',
        'source.completed': '完結済',
        'source.unsupported': 'ソース「{source}」は現在サポートされていません。',
        'source.error': 'データの読み込みエラー。',
        'source.list_title': '{source} リスト',

        'profile.edit_title': 'プロフィールを編集',
        'profile.save': '保存',
        'profile.display_name': '表示名',
        'profile.bio': '自己紹介',
        'profile.bio_placeholder': '自己紹介を入力...',
        'profile.upload_success': '画像のアップロードに成功しました。',
        'profile.upload_failed': '画像のアップロードに失敗しました。',
        'profile.save_success': 'プロフィールが更新されました。',
        'profile.save_failed': 'プロフィールの保存に失敗しました。',
        'profile.crop_title': '画像の編集',
        'profile.crop_zoom_out': 'ズームアウト',
        'profile.crop_zoom_in': 'ズームイン',
        'profile.crop_done': '完了',
        'profile.no_frame': 'なし',
        'profile.no_cover': 'なし',

        'downloads.clear_all': 'すべてクリア',
        'downloads.pause_all': 'すべて一時停止',
        'downloads.resume': '再開 ({count})',
        'downloads.start': '開始 ({count})',
        'downloads.no_downloads': '待機中のダウンロードはありません。',
        'downloads.queue': 'キュー',
        'downloads.completed': '完了',
        'downloads.clear_history': '履歴を消去',

        // Comic Detail Modals
        'comic.filter': 'フィルター',
        'comic.sort': '並べ替え',
        'comic.display': '表示',
        'comic.filter.downloaded': 'ダウンロード済み',
        'comic.filter.unread': '未読',
        'comic.filter.bookmarked': 'ブックマーク済み',
        'comic.sort.source': 'ソース名 / アルファベット順',
        'comic.sort.chapter': 'チャプター番号順',
        'comic.sort.date': '更新日順 (API未対応)',
        'comic.display.source': 'ソースタイトル',
        'comic.display.chapter': 'チャプター番号',
        'comic.added_queue': 'すべてキューに追加しました',
        'comic.added_zip_queue': 'コミック全体(ZIP)をダウンロードキューに追加しました!',
        'comic.added_chapter': '第 {number} 話を追加しました',
        'comic.added_chapter_queue': '第 {number} 話をダウンロードキューに追加しました',
        'comic.no_chapters': 'チャプターがありません',
        'comic.queue_count': '{count} 話のダウンロードを予約しました',
        'comic.mark_read': '既読にする',
        'comic.mark_unread': '未読にする',
        'comic.mark_read_down': 'ここから下を既読に',
        'comic.bookmark': 'ブックマーク',
        'comic.add_queue': 'キューに追加',
        'comic.download_now': '今すぐダウンロード',

        'comic.chapters': 'チャプター',
        'comic.total': '全 {count} 話',
        'comic.download_all': '一括ダウンロード (ZIP)',
        'comic.queue_all': 'すべてキューに追加',
        'comic.read': '読む',
        'chapters.downloading': 'ダウンロード中...',
        'chapters.completed': '完了',
        'chapters.pending': '待機中',
        'chapters.paused': '一時停止',
        'chapters.failed': '失敗',

        // Reader Settings
        'reader.settings.mode': '読書モード',
        'reader.settings.general': '一般',
        'reader.settings.filters': 'カスタムフィルター',
        'reader.settings.reading_mode': '読書モード',
        'reader.mode.default': 'デフォルト',
        'reader.mode.paged': 'ページ送り（左から右）',
        'reader.mode.webtoon': '縦スクロール',
        'reader.settings.tap_zone': 'タップゾーン',
        'reader.tap.default': 'デフォルト',
        'reader.tap.l_shape': 'L字型',
        'reader.tap.kindle': 'Kindle風',
        'reader.tap.off': 'オフ',
        'reader.settings.invert_tap': 'タップゾーンを反転',
        'reader.invert.none': 'なし',
        'reader.invert.horizontal': '水平',
        'reader.invert.vertical': '垂直',
        'reader.invert.both': '両方',
        'reader.settings.side_padding': '横の余白',
        'reader.settings.auto_scroll': '自動スクロール速度',
        'reader.settings.auto_scroll_level': 'レベル {level}',
        'reader.settings.double_tap_zoom': 'ダブルタップでズーム',
        'reader.settings.bg_color': '背景色',
        'reader.bg.black': '黒',
        'reader.bg.gray': 'グレー',
        'reader.bg.white': '白',
        'reader.settings.show_page': 'ページ番号を表示',
        'reader.settings.fullscreen': '全画面表示',
        'reader.settings.custom_brightness': 'カスタム明るさ',
        'reader.settings.grayscale': 'グレースケール',
        'reader.settings.invert_colors': '色を反転',
        'reader.settings.crop_borders': '余白を切り取る',
        'reader.settings.split_double_pages': '見開きページを分割',

        // Misc
        'reader.chapter': '第 {number} 話',
        'comic.continue_reading': '続きを読む',
        'comic.start_reading': '読み始める',
        'comic.latest_chapter': '最新話',
        'comic.author': '作者',
        'comic.status': 'ステータス',
        'comic.status.ongoing': '連載中',
        'comic.status.completed': '完結済',

        // Home & Library
        'home.browse': 'ソースを閲覧',
        'home.latest': '最新',
        'home.coming_soon': '今後のアップデートで公開予定。',
        'library.title': 'ライブラリ',
        'library.empty': 'ライブラリは空です。',
        'library.browse': 'マンガを閲覧',
        'library.failed': 'ライブラリの読み込みに失敗しました.',

        //History
        'history.empty': 'まだ読んだことのない本はありません。',
        'history.failed': '読んだことのない本の読み込みに失敗しました。',
        'history.img_not_found': '画像が見つかりません。',
    }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('vi'); // default vi as user requested initially
    const [theme, setTheme] = useState<Theme>('dark');
    const [accentColor, setAccentColor] = useState<AccentColor>('#f97316');

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.language) setLanguage(parsed.language);
                if (parsed.theme) setTheme(parsed.theme);
                if (parsed.accentColor) setAccentColor(parsed.accentColor);
            }
        } catch (e) {
            console.error('Failed to parse settings', e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ language, theme, accentColor }));

        // Apply theme and accent color to document root
        const root = document.documentElement;

        // Apply accent color
        root.style.setProperty('--color-primary', accentColor);

        // Apply theme background and text colors
        if (theme === 'light') {
            root.style.setProperty('--color-bg', '#f5f5f5');
            root.style.setProperty('--color-surface', '#ffffff');
            root.style.setProperty('--color-surface-hover', '#e5e5e5');
            root.style.setProperty('--color-text', '#121212');
            root.style.setProperty('--color-text-muted', '#666666');
            root.style.setProperty('--color-border', '#d4d4d4');
            root.classList.remove('dark');
        } else {
            root.style.setProperty('--color-bg', '#121212');
            root.style.setProperty('--color-surface', '#1e1e1e');
            root.style.setProperty('--color-surface-hover', '#2c2c2c');
            root.style.setProperty('--color-text', '#e0e0e0');
            root.style.setProperty('--color-text-muted', '#9e9e9e');
            root.style.setProperty('--color-border', '#3c3c3c');
            root.classList.add('dark');
        }

    }, [language, theme, accentColor]);

    const t = (key: string, replacements?: Record<string, string | number>) => {
        let str = translations[language]?.[key] || translations['en']?.[key] || key;
        if (replacements) {
            Object.keys(replacements).forEach(k => {
                str = str.replace(`{${k}}`, String(replacements[k]));
            });
        }
        return str;
    };

    return (
        <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, accentColor, setAccentColor, t }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
