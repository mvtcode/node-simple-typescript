import dotenv from 'dotenv';
dotenv.config();

import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 50,
  async requestHandler({ request, page, parseWithCheerio, enqueueLinks, pushData, log }) {
    log.info(`Crawling: ${request.loadedUrl}`);
    const $ = await parseWithCheerio();

    if (request.label === 'DETAIL') {
      // detail page
      await page.waitForLoadState('networkidle');
      const links = await page.locator('#contentWrap ul.sub-list li a.subContent');
      const count = await links.count();
      const title = $('#title').text();
      for (let i = 0; i < count; i++) {
        const link = links.nth(i);

        const subTitle = await link.innerText();
        const url = (await link.getAttribute('href')) || '';

        // Click
        await link.click();
        await page.waitForLoadState('networkidle'); // đợi ajax
        await page.waitForTimeout(1000);

        const $$ = await parseWithCheerio();

        // Đọc content
        $$('#contentBody').find('script').remove();
        $$('#contentBody')
          .find('*')
          .filter(function () {
            return $$(this).css('display') === 'none';
          })
          .remove();
        const content = $$('#contentBody').html();

        await pushData({
          title,
          subTitle,
          label: 'AJAX',
          url: url.startsWith('#') ? `${request.loadedUrl}${url}` : url,
          refer: request.headers?.['Referer'],
          content,
        });
        await page.waitForTimeout(500);
      }
    } else {
      // home page
      const title = (
        ($('.wpsPortletBody .lotusui').text() || (await page.title())) as string
      ).trim();
      $('.wpsPortletBody script').remove();
      const content = $('.wpsPortletBody .lotusWidgetBody3').html();
      const url = request.loadedUrl;
      await pushData({
        title,
        label: request.label,
        url,
        refer: request.headers?.['Referer'],
        content,
      });
    }

    await enqueueLinks({
      // strategy: 'same-origin',
      selector: '.wpsPortletBody .lotusWidgetBody3 a',
      label: 'DETAIL',
      transformRequestFunction: (req) => {
        return {
          ...req,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: request.loadedUrl,
          },
          keepUrlFragment: false,
        };
      },
    });
  },

  // Uncomment this option to see the browser window.
  // headless: false,
});

(async () => {
  await crawler.run([
    'https://www.gdt.gov.vn/wps/portal/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8zinQO9ncO8wwwM3D0szQ08fUNNA0KNHA0sHM31wwkpiAJKG-AAjgZA_VFgJc7ujh4m5j4GBhYm7gYGniZO_n4ezoGGBp7GUAV4zCjIjTDIdFRUBAAyRnXb/dz/d5/L2dBISEvZ0FBIS9nQSEh/',
  ]);

  // const dataset = await Dataset.open();
  // const { items } = await dataset.getData();

  // console.log(items);
})();
