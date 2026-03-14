# 微信公众号 API 参考

## 基础支持

### 获取 Access Token
```
GET https://api.weixin.qq.com/cgi-bin/token
?grant_type=client_credential&appid={APPID}&secret={APPSECRET}

Response:
{ "access_token": "...", "expires_in": 7200 }
```

## 素材管理

### 上传图文消息内的图片
```
POST https://api.weixin.qq.com/cgi-bin/media/uploadimg
?access_token={ACCESS_TOKEN}

Body: multipart/form-data, field: media

Response:
{ "url": "https://mmbiz.qpic.cn/..." }
```

### 新增永久素材（图片）
```
POST https://api.weixin.qq.com/cgi-bin/material/add_material
?access_token={ACCESS_TOKEN}&type=image

Body: multipart/form-data, field: media

Response:
{ "media_id": "...", "url": "..." }
```

## 草稿箱

### 新建草稿
```
POST https://api.weixin.qq.com/cgi-bin/draft/add
?access_token={ACCESS_TOKEN}

Body:
{
  "articles": [{
    "title": "标题",
    "author": "作者",
    "digest": "摘要",
    "content": "<html>...</html>",
    "thumb_media_id": "封面图 media_id",
    "content_source_url": "原文链接",
    "need_open_comment": 0
  }]
}

Response:
{ "media_id": "..." }
```

## 发布

### 发布接口
```
POST https://api.weixin.qq.com/cgi-bin/freepublish/submit
?access_token={ACCESS_TOKEN}

Body:
{ "media_id": "草稿 media_id" }

Response:
{ "publish_id": "..." }
```

### 查询发布状态
```
POST https://api.weixin.qq.com/cgi-bin/freepublish/get
?access_token={ACCESS_TOKEN}

Body:
{ "publish_id": "..." }

Response:
{
  "publish_id": "...",
  "publish_status": 0,  // 0=成功
  "article_id": "...",
  "article_detail": {
    "count": 1,
    "item": [{ "article_url": "..." }]
  }
}
```

## 注意事项

- access_token 有效期 7200 秒
- 每日调用次数有限制
- 图片大小限制：10MB
- 文章内容需符合平台规范
- 所有 CSS 必须内联
- 不支持外部 JavaScript
- 不支持 iframe
- 图片 URL 必须使用微信域名
