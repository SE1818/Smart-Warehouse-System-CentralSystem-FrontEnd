import type { Plugin, ViteDevServer } from 'vite';
import fs from 'fs';
import path from 'path';

export interface NgrokPluginOptions {
  /**
   * Ngrok Authtoken. Can also be set via NGROK_AUTHTOKEN environment variable.
   */
  authtoken?: string;
  /**
   * Optional custom static domain (e.g. stereo-gravity-humbly.ngrok-free.dev).
   * If omitted, Ngrok automatically generates a dynamic random URL on every startup.
   */
  domain?: string;
  /**
   * Target port to forward (default: 5173).
   */
  port?: number;
  /**
   * Staff path appended to the public URL (default: /staff/kds).
   */
  staffPath?: string;
  /**
   * Whether to enable the tunnel (default: true in development).
   */
  enabled?: boolean;
}

/**
 * Vite plugin that automatically starts an Ngrok public tunnel whenever
 * the restaurant frontend project is launched, generating a public HTTPS link
 * and an ASCII QR code for store staff to access on their phones and tablets.
 */
export function restaurantNgrokPlugin(options: NgrokPluginOptions = {}): Plugin {
  return {
    name: 'vite-plugin-restaurant-ngrok',
    apply: 'serve', // Only runs in development dev server mode
    configureServer(server: ViteDevServer) {
      if (options.enabled === false) {
        return;
      }

      server.httpServer?.once('listening', async () => {
        const address = server.httpServer?.address();
        const port = typeof address === 'object' && address?.port ? address.port : (options.port || 5173);
        const staffPath = options.staffPath || '/staff/kds';
        const authtoken = options.authtoken || process.env.NGROK_AUTHTOKEN;
        const domain = options.domain || process.env.NGROK_DOMAIN;

        console.log('\n\x1b[36m%s\x1b[0m', '======================================================================');
        console.log('\x1b[1m\x1b[36m%s\x1b[0m', ' 🍽️  VORA RESTAURANT - TỰ ĐỘNG KHỞI TẠO ĐƯỜNG HẦM NGROK CHO STAFF ');
        console.log('\x1b[36m%s\x1b[0m', '======================================================================');

        try {
          const ngrokModule = await import('@ngrok/ngrok');
          const ngrok = ngrokModule.default || ngrokModule;

          const forwardConfig: Record<string, any> = {
            addr: port,
          };

          if (authtoken) {
            forwardConfig.authtoken = authtoken;
          } else {
            forwardConfig.authtoken_from_env = true;
          }

          if (domain) {
            forwardConfig.domain = domain;
          }

          const listener = await ngrok.forward(forwardConfig);
          const rawUrl = listener.url();
          const staffUrl = `${rawUrl}${staffPath}`;

          console.log('\x1b[32m%s\x1b[0m', '✅ Đường hầm Ngrok đã kết nối thành công!');
          console.log('\x1b[1m\x1b[33m%s\x1b[0m', '👉 Link truy cập Staff KDS (Dành cho nhân viên trong quán):');
          console.log('\x1b[1m\x1b[32m%s\x1b[0m', `   ${staffUrl}\n`);
          console.log('\x1b[90m%s\x1b[0m', `👉 Link Trang chủ Public: ${rawUrl}`);

          // Render QR Code in terminal so staff can scan from their phone/tablet camera
          try {
            const qrcodeModule = await import('qrcode-terminal');
            const qrcode = qrcodeModule.default || qrcodeModule;
            console.log('\x1b[36m%s\x1b[0m', '📱 Quét mã QR dưới đây bằng điện thoại / máy tính bảng để mở KDS ngay:');
            qrcode.generate(staffUrl, { small: true }, (qr: string) => {
              console.log(qr);
            });
          } catch {
            // Ignore if qrcode terminal fails to format
          }

          // Persist the latest staff link to file for easy reference
          try {
            const linkFilePath = path.resolve(process.cwd(), 'STAFF_LINK.txt');
            fs.writeFileSync(
              linkFilePath,
              `# VORA Restaurant Staff Public Link (Tự động cập nhật mỗi khi mở frontend)\nSTAFF_KDS_URL=${staffUrl}\nPUBLIC_URL=${rawUrl}\nUPDATED_AT=${new Date().toLocaleString('vi-VN')}\n`,
              'utf-8'
            );
            console.log('\x1b[90m%s\x1b[0m', '💾 Đã lưu đường dẫn vào file: smartwarehouse-frontend/STAFF_LINK.txt');
          } catch {
            // Ignore file write error
          }

          console.log('\x1b[36m%s\x1b[0m', '======================================================================\n');

          // Gracefully close ngrok when server shuts down
          const cleanup = async () => {
            try {
              await listener.close();
            } catch {
              // ignore
            }
          };
          server.httpServer?.on('close', cleanup);
          process.on('SIGINT', cleanup);
          process.on('SIGTERM', cleanup);
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          if (errMsg.includes('ERR_NGROK_4018') || errMsg.includes('not authenticated') || errMsg.includes('valid credential')) {
            console.log('\x1b[33m%s\x1b[0m', '⚠️  [NGROK] Chưa cấu hình Authtoken để mở link công khai cho nhân viên!');
            console.log('\x1b[37m%s\x1b[0m', '   Để tự động sinh link Ngrok mỗi lần khởi động:');
            console.log('\x1b[36m%s\x1b[0m', '   1. Đăng ký tài khoản miễn phí tại: https://dashboard.ngrok.com/signup');
            console.log('\x1b[36m%s\x1b[0m', '   2. Lấy Authtoken tại: https://dashboard.ngrok.com/get-started/your-authtoken');
            console.log('\x1b[36m%s\x1b[0m', '   3. Dán vào file smartwarehouse-frontend/.env:');
            console.log('\x1b[1m\x1b[32m%s\x1b[0m', '      NGROK_AUTHTOKEN=your_authtoken_here\n');
            console.log('\x1b[90m%s\x1b[0m', '   * Gợi ý: Nhân viên trong cùng mạng Wi-Fi quán có thể dùng link Network (IP) của Vite bên trên.');
          } else {
            console.log('\x1b[31m%s\x1b[0m', `⚠️  [NGROK] Không thể khởi tạo đường hầm: ${errMsg}`);
          }
          console.log('\x1b[36m%s\x1b[0m', '======================================================================\n');
        }
      });
    },
  };
}

