export const NVIDIUM_CONFIG_CONTENT = '[ВСТАВЬ СВОЙ JSON СЮДА]';

export interface ModConfigEntry {
  modId: string;
  modName: string;
  filePath: string;
  title: string;
  note: string;
  content: string;
}

export const MOD_RECOMMENDED_CONFIGS: ModConfigEntry[] = [
  {
    modId: 'nvidium',
    modName: 'Nvidium',
    filePath: 'config/connector.json / nvidium',
    title: 'Конфиг Nvidium (Sinytra / алиасы)',
    note: 'Требует NVIDIA GTX 16xx / RTX 20xx+ и отключённых шейдеров.',
    content: NVIDIUM_CONFIG_CONTENT,
  },
  {
    modId: 'sinytra-connector',
    modName: 'Sinytra Connector',
    filePath: 'config/connector.json',
    title: 'Алиас Embeddium → Sodium для Fabric-аддонов',
    note: 'Позволяет Fabric-модам (в т.ч. Nvidium) видеть Embeddium как Sodium.',
    content: `{
  "version": 1,
  "hiddenMods": [],
  "dependencyOverrides": {
    "nvidium": {
      "sodium": ">=0.5.0"
    }
  }
}`,
  },
  {
    modId: 'concurrent-chunk-management-engine-forge-c2me',
    modName: 'C2ME-Forge (C2MEF)',
    filePath: 'config/c2me.toml',
    title: 'Стабильные потоки генерации чанков на Forge',
    note: 'Отключение noTickViewDistance предотвращает конфликты миксинов и утечки чанков.',
    content: `[noTickViewDistance]
enabled = false

[ioSystem]
asyncChunkio = true`,
  },
  {
    modId: 'c2me-concurrent-chunk-management-engine',
    modName: 'C2ME (Fabric через Sinytra)',
    filePath: 'config/c2me.toml',
    title: 'Безопасный режим C2ME через Sinytra Connector',
    note: 'Обязательно выключите noTickViewDistance при запуске поверх Forge 1.20.1.',
    content: `[noTickViewDistance]
enabled = false`,
  },
  {
    modId: 'modernfix',
    modName: 'ModernFix',
    filePath: 'config/modernfix-mixins.properties',
    title: 'Рекомендуемые флаги памяти и запуска',
    note: 'Dynamic Resources экономит до 30–50% RAM на ресурсах модов.',
    content: `mixin.perf.dynamic_resources=true
mixin.perf.faster_item_rendering=true
mixin.bugfix.packet_threading=true`,
  },
  {
    modId: 'sodium-chloride',
    modName: '(Sodium) Chloride',
    filePath: 'config/chloride-client.toml',
    title: 'Отключение дублей при совместной работе с Dynamic Lights',
    note: 'Если установлен отдельный Sodium/Embeddium Dynamic Lights, отключите свет в Chloride.',
    content: `[general]
fullbright = false
[dynamicLights]
mode = "OFF"`,
  },
  {
    modId: 'particle-core',
    modName: 'Particle Core',
    filePath: 'config/particle_core.json',
    title: 'Оптимизация частиц и отсечение за стенами',
    note: 'Снижает нагрузку от частиц без удаления визуально важных эффектов.',
    content: `{
  "cullParticlesInSight": true,
  "reduceAllChance": 0.0,
  "maxParticles": 4000
}`,
  },
];
