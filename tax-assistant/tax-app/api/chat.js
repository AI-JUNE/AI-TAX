// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 속도가 빠르고 저렴한 gpt-4o-mini를 추천합니다.
        messages: [
          { role: "system", content: system },
          ...messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'OpenAI API 호출 오류' 
      });
    }

    const replyText = data.choices[0].message.content;
    res.status(200).json({ text: replyText });

  } catch (error) {
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
