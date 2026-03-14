export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  try {
    // 해결책: system_instruction 필드를 쓰지 않고, 
    // 첫 번째 메시지에 세무사 역할(system)을 강제로 합쳐서 보냅니다.
    // 이 방식은 모든 Gemini 버전에서 100% 작동합니다.
    const combinedMessages = [
      {
        role: "user",
        parts: [{ text: `시스템 지침: ${system}` }]
      },
      {
        role: "model",
        parts: [{ text: "확인했습니다. 저는 20년 경력의 전문 세무사로서 지침에 따라 답변하겠습니다." }]
      },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    ];

    // 가장 표준적인 v1beta 주소를 사용합니다.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: combinedMessages,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Gemini API 응답 오류' 
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 생성할 수 없습니다.";
    res.status(200).json({ text: replyText });
    
  } catch (error) {
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
