import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';

// 文档路由统一挂在全局前缀下（如 /api/openapi.json）：
// 1) 与 API 同走 nginx 的 ^~ /api/ 反代，docker 部署下静态文档页（deploy/nginx/*.html）才取得到规格；
// 2) 根路径 /openapi.json 在 nginx 侧被硬 404 封死，规格只从这一条受 swagger.enable 管控的路出来
// 是否开启由 main.ts 的 swagger.enable 判断，本函数仅在开启时调用
const normalizeBase = (prefix?: string): string => (prefix ? `/${String(prefix).replace(/^\/+/, '')}` : '');

const SWAGGER_HTML = (base = '') => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nest-Admin API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: '${base}/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'StandaloneLayout',
          persistAuthorization: true
        });
      };
    </script>
  </body>
</html>
`;

const REDOC_HTML = (themeColor = '#1890ff', base = '') => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Nest-Admin API 文档</title>
    <style>
      body { margin: 0; padding: 0; }
      redoc { display: block; }
    </style>
  </head>
  <body>
    <redoc
      spec-url="${base}/openapi.json"
      theme='{"colors": {"primary": {"main": "${themeColor}"}}}'
      hide-hostname="true"
      required-props-first="true"
      expand-responses="200,400,401,403,404,500"
      disable-telemetry="true"
    ></redoc>
    <script type="module" src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
`;

export function setupApiDocs(app: INestApplication, prefix = '', themeColor = '#1890ff'): void {
  // 前缀归一化：config 里是 'api'（无前导斜杠），必须补齐否则挂载点永不匹配请求路径（此 bug 曾致文档页不可达）
  const base = normalizeBase(prefix);

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Nest-Admin')
    .setDescription('Nest-Admin 接口文档')
    .setVersion('2.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  const openApiJsonPath = join(process.cwd(), 'openApi.json');
  writeFileSync(openApiJsonPath, JSON.stringify(document, null, 2));

  // app.use 按前缀匹配，swagger-ui 带不带尾斜杠都会命中，无需重复注册
  app.use(`${base}/openapi.json`, (req, res) => {
    res.sendFile(openApiJsonPath);
  });

  app.use(`${base}/swagger-ui`, (req, res) => {
    res.type('html').send(SWAGGER_HTML(base));
  });

  app.use(`${base}/docs`, (req, res) => {
    res.type('html').send(REDOC_HTML(themeColor, base));
  });
}
