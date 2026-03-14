// api/chat.js
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

    // ✅ v1beta 주소를 사용해야 system_instruction 필드가 정상 작동합니다.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
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
          maxOutputTokens: 2000,
          temperature: 0.7,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.' 
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "응답 내용을 찾을 수 없습니다.";
    res.status(200).json({ text: replyText });
    
  } catch (error) {
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}
