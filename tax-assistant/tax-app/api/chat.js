// api/chat.js (가장 안정적인 최종 버전)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  try {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // v1beta가 system_instruction 필드 인식에 가장 관대합니다.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        system_instruction: {
          parts: [{ text: system }]
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'API 응답 오류' 
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 생성할 수 없습니다.";
    res.status(200).json({ text: replyText });
    
  } catch (error) {
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
