// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  try {
    // Gemini API 호출을 위한 메시지 구조 변환
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system }]
        },
        contents: contents,
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API 응답 오류' });
    }

    // Gemini 응답 텍스트 추출
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "응답을 생성할 수 없습니다.";
    res.status(200).json({ text: replyText });
  } catch (error) {
    res.status(500).json({ error: '서버 내부 오류 발생' });
  }
}
