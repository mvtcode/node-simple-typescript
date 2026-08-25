import http from 'http';
import fs from 'fs';
import { server } from '../src/index';
import { config } from '../src/config';

function makeRequest(options: http.RequestOptions, body?: Buffer | string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Integration Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await makeRequest({
      hostname: '127.0.0.1',
      port: config.port,
      path: '/health',
      method: 'GET',
    });
    assert(healthRes.statusCode === 200, 'Health check status is 200');
    const healthJson = JSON.parse(healthRes.body);
    assert(healthJson.status === 'ok', 'Health status is ok');

    // 2. Reject non-multipart POST
    const nonMultipartRes = await makeRequest({
      hostname: '127.0.0.1',
      port: config.port,
      path: config.basePath,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, JSON.stringify({ hello: 'world' }));
    assert(nonMultipartRes.statusCode === 400, 'Non-multipart request returns 400');

    // 3. Reject multipart without file
    const boundary = '----WebKitFormBoundaryTest123456';
    const emptyMultipartBody = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="someField"\r\n\r\nsomeValue\r\n--${boundary}--\r\n`
    );
    const noFileRes = await makeRequest({
      hostname: '127.0.0.1',
      port: config.port,
      path: config.basePath,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': emptyMultipartBody.length,
      },
    }, emptyMultipartBody);
    assert(noFileRes.statusCode === 400, 'Multipart without file returns 400');

    // 4. Successful file upload
    const testContent = 'Hello Antigravity File Upload Test Content! ' + Date.now();
    const testFilename = 'sample_photo.jpg';
    const fileMultipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${testFilename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
      Buffer.from(testContent),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await makeRequest({
      hostname: '127.0.0.1',
      port: config.port,
      path: config.basePath,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fileMultipartBody.length,
      },
    }, fileMultipartBody);

    assert(uploadRes.statusCode === 200, 'Upload request returns 200');
    const uploadJson = JSON.parse(uploadRes.body);
    assert(uploadJson.status === 'success', 'Response status is "success"');
    assert(uploadJson.message === 'File uploaded successfully', 'Response message is correct');
    assert(uploadJson.data.originalName === testFilename, 'data.originalName matches');
    assert(uploadJson.data.fieldName === 'file', 'data.fieldName matches');
    assert(uploadJson.data.mimeType === 'image/jpeg', 'data.mimeType is image/jpeg');
    assert(uploadJson.data.size === Buffer.from(testContent).length, 'data.size matches byte length');
    assert(fs.existsSync(uploadJson.data.path), 'Uploaded file exists on disk at data.path');

    const generatedFilename = uploadJson.data.filename;
    const expectedPublishUrl = `${config.basePath}/${generatedFilename}`;
    assert(uploadJson.data.publishUrl === expectedPublishUrl, 'data.publishUrl matches pattern');

    // 5. Test static file serving via publishUrl
    const serveRes = await makeRequest({
      hostname: '127.0.0.1',
      port: config.port,
      path: uploadJson.data.publishUrl,
      method: 'GET',
    });
    assert(serveRes.statusCode === 200, 'Static GET returns 200');
    assert(serveRes.body === testContent, 'Static file content matches uploaded content');

    // 6. Test abort midway
    console.log('Testing upload abort midway...');
    const abortBoundary = '----WebKitFormBoundaryAbort123456';
    const largeChunk = Buffer.alloc(1024 * 1024 * 5, 'A'); // 5MB buffer
    const abortHeader = Buffer.from(
      `--${abortBoundary}\r\nContent-Disposition: form-data; name="file"; filename="aborted_file.dat"\r\nContent-Type: application/octet-stream\r\n\r\n`
    );

    await new Promise<void>((resolveAbortTest) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: config.port,
        path: config.basePath,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${abortBoundary}`,
          'Content-Length': abortHeader.length + largeChunk.length * 5 + 100,
        },
      });

      req.on('error', () => {
        // Expected client abort error
      });

      // Write header and first chunk
      req.write(abortHeader);
      req.write(largeChunk);

      // Now destroy socket immediately before finishing
      setTimeout(() => {
        req.destroy();
        // Give server 500ms to process abort cleanup
        setTimeout(() => {
          const filesInPublic = fs.readdirSync(config.publicPath);
          const tmpFiles = filesInPublic.filter((f) => f.endsWith('.tmp') || f.startsWith('aborted_file'));
          assert(tmpFiles.length === 0, `No tmp or aborted files left on disk (found: ${tmpFiles.join(', ')})`);
          resolveAbortTest();
        }, 500);
      }, 50);
    });

    console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    server.close(() => {
      console.log('Server closed.');
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

// Small delay to allow server to be listening
setTimeout(runTests, 500);
