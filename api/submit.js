export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { service, phone, time, location } = req.body;

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "手机号格式不正确" });
  }

  if (!location) {
    return res.status(400).json({ error: "服务区域不能为空" });
  }

  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  const markdown = [
    "### 新轮胎需求登记",
    "",
    `**服务类型：** ${service || "未选择"}`,
    "",
    `**联系电话：** ${phone}`,
    "",
    `**预计时间：** ${time || "未选择"}`,
    "",
    `**服务区域：** ${location}`,
    "",
    `**登记时间：** ${now}`,
    "",
    "---",
    "",
    "请尽快联系司机确认需求",
  ].join("\n");

  const webhook = process.env.DINGTALK_WEBHOOK || "https://oapi.dingtalk.com/robot/send?access_token=982e5352cb711b4f238183710ced4e47faeda98e4f9b20174d89592cc2c721ac";

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          title: `新需求：${service} - ${phone.slice(-4)}`,
          text: markdown,
        },
      }),
    });

    const result = await response.json();

    if (result.errcode === 0) {
      return res.status(200).json({ success: true, message: "已推送到钉钉" });
    } else {
      return res.status(500).json({ error: "钉钉推送失败", detail: result.errmsg });
    }
  } catch (err) {
    return res.status(500).json({ error: "推送异常", detail: err.message });
  }
}
