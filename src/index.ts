import { CheerioCrawler, log } from 'crawlee';
import * as fs from 'fs';
import * as path from 'path';
import TurndownService from 'turndown';
import { tables } from 'turndown-plugin-gfm';

// Interface để lưu trữ breadcrumbs
interface BreadcrumbData {
  breadcrumbs: Array<{ title: string; url: string }>;
}

// Tạo thư mục lưu trữ nếu chưa có
const outputDir = path.join(__dirname, '../output', 'mpos-digital');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
// Sử dụng plugin tables để convert HTML tables sang Markdown
turndown.use(tables);

const crawler = new CheerioCrawler({
  // Giới hạn để tránh spam server hoặc test nhanh
  maxRequestsPerCrawl: 1000,

  // Sử dụng preNavigationHooks để set custom headers
  preNavigationHooks: [
    async ({ request }) => {
      request.headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Referer: 'https://chuyendoiso.nextpay.vn/mpos-guide/',
        Connection: 'keep-alive',
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
    log.info(`Đang xử lý Page: ${request.url} (url: ${url.pathname})`);
    const pathsDebug = ['/danh-muc/mpos-guide/cau-hoi-thuong-gap/'];
    const isShowDebug = pathsDebug.includes(url.pathname);

    const pageTitle =
      $('.container.mt--100 main.main-content .HT_Header h4').text().trim() || 'Trang chủ';

    // Kiểm tra xem có phải trang chủ không
    const isHomepage = [
      'https://chuyendoiso.nextpay.vn/mpos-guide',
      'https://chuyendoiso.nextpay.vn/mpos-guide/',
    ].includes(request.url);

    // Lấy breadcrumbs từ userData (nếu có)
    const parentBreadcrumbs = (request.userData as BreadcrumbData)?.breadcrumbs || [];

    // Xây dựng breadcrumbs hiện tại
    const currentBreadcrumbs: Array<{ title: string; url: string }> = [
      ...parentBreadcrumbs,
      { title: pageTitle, url: request.url },
    ];

    // PHÂN BIỆT XỬ LÝ TRANG CHỦ VÀ TRANG CON
    if (isHomepage) {
      if (isShowDebug) {
        log.info('==================Home page==================');
      }
      // TRANG CHỦ: Theo rules cũ - enqueue tất cả same-domain links
      log.info('Đang ở trang chủ - áp dụng same-domain strategy');
      await enqueueLinks({
        strategy: 'same-domain',
        // Chỉ enqueue các URLs có pattern cụ thể
        transformRequestFunction: (req) => {
          const url = new URL(req.url);
          const pathname = url.pathname;

          // Chỉ cho phép URLs bắt đầu với /danh-muc/mpos-guide/ hoặc /mpos-guide
          if (pathname.startsWith('/danh-muc/mpos-guide/') || pathname.startsWith('/mpos-guide')) {
            return req;
          }

          // Bỏ qua các URLs không khớp pattern
          return false;
        },
        userData: {
          breadcrumbs: currentBreadcrumbs,
        } as BreadcrumbData,
      });
    } else {
      if (isShowDebug) {
        log.info('==================Child page==================');
      }
      // TRANG CON: Chỉ enqueue các link có class "KTDt-link"
      log.info('Đang ở trang con - chỉ theo link KTDt-link');
      const ktdtLinks: string[] = [];
      $('.KTDt-link a').each((_, el) => {
        const href = $(el).attr('href');
        const linkTitle = $(el).text().trim() || 'No Title';
        if (href) {
          try {
            const absoluteUrl = new URL(href, request.url).href;
            if (
              absoluteUrl.startsWith('https://chuyendoiso.nextpay.vn/danh-muc/mpos-guide') ||
              absoluteUrl.startsWith('https://chuyendoiso.nextpay.vn/mpos-guide')
            ) {
              ktdtLinks.push(absoluteUrl);
              log.info(`Tìm thấy link KTDt: ${linkTitle} - ${absoluteUrl}`);
            }
          } catch {
            log.error(`Lỗi URL: ${href}`);
          }
        }
      });

      // Enqueue các link đã tìm được với breadcrumbs
      for (const link of ktdtLinks) {
        await enqueueLinks({
          urls: [link],
          userData: {
            breadcrumbs: currentBreadcrumbs,
          } as BreadcrumbData,
        });
      }
    }

    // 1. Loại bỏ các thành phần gây nhiễu đặc thù của WordPress
    $(
      'header, footer, aside, script, style, .admin-bar, ' +
        '.entry-meta, .nav-links, .widget-area, #comments, .sharedaddy, ' +
        '.wp-embed-responsive, .related-posts, ' +
        '.container.mt--100 main.main-content .KTDt-link ul > li a img, ' +
        '.container.mt--100 main.main-content .HT_Header a, ' +
        '.container.mt--100 .box-search'
    ).remove();

    // 2. Xác định vùng chứa nội dung chính tối ưu cho WordPress
    // Content page detail
    let $mainContent = $('.container.mt--100 main.main-content .KT-Detail');

    if ($mainContent.length === 0) {
      // home page remove list link items
      $('.container.mt--100 .list-item ul.list li span:has(img), .VW-left-menu').remove();

      if (isHomepage) {
        // Kết hợp nội dung từ cả 2 vùng
        const section1 = $('.container.mt--100');
        const section2 = $('.container .asked-ques');

        // Tạo một wrapper để chứa cả 2 phần
        $mainContent = $('<div></div>') as any;
        if (section1.length > 0) {
          $mainContent.append(section1.clone());
        }
        if (section2.length > 0) {
          $mainContent.append(section2.clone());
        }
      }

      if (isShowDebug) {
        log.info('==================Step 1==================');
      }
    }

    if ($mainContent.length === 0) {
      // content other
      $mainContent = $('.container.mt--100 main.main-content .KTDt-link');

      if (isShowDebug) {
        log.info('==================Step 2==================');
      }
    }

    if ($mainContent.length === 0) {
      // content other
      $mainContent = $('.container.mt--100 main.main-content');

      if (isShowDebug) {
        log.info('==================Step 3==================');
      }
    }

    // Cuối cùng mới lấy main hoặc body nếu các class trên không tồn tại
    if ($mainContent.length === 0) {
      // $mainContent = $('main').length ? $('main') : $('body');
      if (isShowDebug) {
        log.info('==================Step 4==================');
      }
      return;
    }

    if (pathsDebug.length > 0 && !isShowDebug) {
      return;
    }

    // 4. Xử lý Image: Chuyển link tuyệt đối (như cũ)
    $mainContent.find('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, request.url).href;
          $(el).attr('src', absoluteUrl);
          // WordPress thường có srcset cho ảnh responsive, nên xóa đi để dễ xử lý ở bước sau
          $(el).removeAttr('srcset');
          $(el).removeAttr('sizes');
        } catch {
          log.error(`Lỗi URL ảnh: ${src}`);
        }
      }
    });

    // $('li > img, span > img, a > img').remove();
    $(
      'img[src*="icon-"], img[src*="icon"], img[src*="gim.png"], img[src*="logo"], img[src*="light.png"]'
    ).remove();

    // 4. Lấy nội dung HTML đã bóc tách
    const htmlContent = $mainContent.html() || '';

    // 5. Chuyển đổi sang Markdown
    const markdownResult = turndown.turndown(htmlContent);

    // 6. Xây dựng YAML frontmatter
    const breadcrumbTitles = currentBreadcrumbs.map((item) => item.title);
    const title = pageTitle;
    const category =
      breadcrumbTitles.length > 1 ? breadcrumbTitles[breadcrumbTitles.length - 2] : 'Trang chủ';

    // Tạo breadcrumbs array cho YAML
    const breadcrumbsArray = JSON.stringify(breadcrumbTitles);

    // 7. Tạo YAML frontmatter
    const yamlFrontmatter = `---
title: ${title}
breadcrumbs: ${breadcrumbsArray}
url: "${request.url}"
category: "${category}"
---

# ${title}
`;

    // 8. Tạo nội dung markdown cuối cùng với YAML frontmatter
    const markdownFinal = `${yamlFrontmatter}\n${markdownResult}`;

    // 9. Lưu vào file .md
    // Tạo tên file an toàn từ URL
    const fileName = `${url.pathname.replace(/\//g, '_') || 'index'}.md`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, markdownFinal, 'utf-8');
    log.info(`Đã lưu: ${fileName} - Breadcrumbs: ${breadcrumbTitles.join(' > ')}`);
  },

  // Xử lý khi lỗi
  failedRequestHandler({ request }) {
    log.error(`Yêu cầu ${request.url} thất bại.`);
  },
});

// Chạy Crawler với URL bắt đầu
(async () => {
  await crawler.run(['https://chuyendoiso.nextpay.vn/mpos-guide/']);
  log.info('--- Hoàn thành Bước 1: Crawl và Lưu HTML ---');
})();
