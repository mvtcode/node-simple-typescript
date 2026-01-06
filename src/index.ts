import { CheerioCrawler, log } from 'crawlee';
import * as fs from 'fs';
import * as path from 'path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

// Tạo thư mục lưu trữ nếu chưa có
const outputDir = path.join(__dirname, '../output', 'md');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndown.use(gfm);

const crawler = new CheerioCrawler({
  // Giới hạn để tránh spam server hoặc test nhanh
  maxRequestsPerCrawl: 1000,

  // Sử dụng preNavigationHooks để set custom headers
  preNavigationHooks: [
    async ({ request }) => {
      request.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://hotro.tingbox.vn',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      };
    },
  ],

  async requestHandler({ $, request, enqueueLinks }) {
    const url = new URL(request.url);
    log.info(`Đang xử lý Page: ${request.url}`);

    log.debug($('body').html() || '');

    // TRÍCH XUẤT TITLE: Thường lấy từ thẻ <title> hoặc <h1> chính của bài viết
    const pageTitle = $('title').text().split('|')[0].trim() || $('h1').first().text().trim() || 'No Title';

    await enqueueLinks({
      strategy: 'same-domain',
    });

    // 1. Loại bỏ các thành phần gây nhiễu đặc thù của WordPress
    $(
      'header, footer, nav, aside, script, style, .admin-bar, ' +
      '.entry-meta, .nav-links, .widget-area, #comments, .sharedaddy, ' +
      '.wp-embed-responsive, .related-posts, ' +
      '.container.mt--100 main.main-content .KTDt-link ul > li a img, ' +
      '.container.mt--100 main.main-content .HT_Header a'
    ).remove();

    // 2. Xác định vùng chứa nội dung chính tối ưu cho WordPress
    // Content detail page
    let $mainContent = $('.container.mt--100 main.main-content');

    if ($mainContent.length === 0) {
      // home page remove list link items
      $('.container.mt--100 .list-item ul.list li span:has(img)').remove();
      $('.container.mt--100 .list-item .banner-kichhoat span:has(img)').remove();

      // table "Ngân hàng hỗ trợ liên kết nhận tiền trực tiếp"
      const rows = $('.container.mt--100 .table-bank table tbody tr td:first-child');
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          const tdFirstChild = rows.eq(i);
          const img = tdFirstChild.find('img');
          const bankName = img.attr('alt') || '';
          img.remove();
          tdFirstChild.text(bankName);

          const tdSecondChild = tdFirstChild.next();
          const isCheck1 = tdSecondChild.find('img').length > 0;
          tdSecondChild.text(isCheck1 ? 'Có' : 'Không');

          const tdThirdChild = tdSecondChild.next();
          const isCheck2 = tdThirdChild.find('img').length > 0;
          tdThirdChild.text(isCheck2 ? 'Có' : 'Không');

          const tdFourthChild = tdThirdChild.next();
          const isCheck3 = tdFourthChild.find('img').length > 0;
          tdFourthChild.text(isCheck3 ? 'Có' : 'Không');
        }
      }
      $mainContent = $('.container.mt--100');
    } else {
      // remove img icon back to right
      // $('.container.mt--100 main.main-content .HT_Header a').remove();
    }

    // Cuối cùng mới lấy main hoặc body nếu các class trên không tồn tại
    if ($mainContent.length === 0) {
      $mainContent = $('main').length ? $('main') : $('body');
    }

    // 3. Xử lý Image: Chuyển link tuyệt đối (như cũ)
    $mainContent.find('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, request.url).href;
          $(el).attr('src', absoluteUrl);
          // WordPress thường có srcset cho ảnh responsive, nên xóa đi để dễ xử lý ở bước sau
          $(el).removeAttr('srcset');
          $(el).removeAttr('sizes');
        } catch (e) {
          log.error(`Lỗi URL ảnh: ${src}`);
        }
      }
    });

    // 4. Lấy nội dung HTML đã bóc tách
    const htmlContent = $mainContent.html() || '';

    // 5. Lưu vào file .html
    // Tạo tên file an toàn từ URL
    const fileName = `${url.pathname.replace(/\//g, '_') || 'index'}.md`;
    const filePath = path.join(outputDir, fileName);
    const markdownResult = turndown.turndown(htmlContent);
    const markdownFinal = `# ${pageTitle}\n\n${markdownResult}`;

    fs.writeFileSync(filePath, markdownFinal, 'utf-8');
    log.info(`Đã lưu: ${fileName}`);
  },

  // Xử lý khi lỗi
  failedRequestHandler({ request }) {
    log.error(`Yêu cầu ${request.url} thất bại.`);
  },
});

// Chạy Crawler với URL bắt đầu
(async () => {
  await crawler.run(['https://hotro.tingbox.vn']);
  log.info('--- Hoàn thành Bước 1: Crawl và Lưu HTML ---');
})();
