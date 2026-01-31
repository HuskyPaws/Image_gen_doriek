'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Home, 
  Scissors, 
  Eraser, 
  Globe, 
  Image as ImageIcon, 
  Settings, 
  Wand2,
  FileText,
  Palette,
  Volume2,
  Languages
} from 'lucide-react';

type Language = 'en' | 'hu';
type Section = 'overview' | 'script-cleaner' | 'script-chunker' | 'prompt-styles' | 'audio' | 'stock-images' | 'thumbnail-tester' | 'settings';

// Translations
const translations = {
  en: {
    title: 'Documentation',
    subtitle: 'Learn how to use the Image Generator App',
    backToApp: 'Back to App',
    
    // Navigation
    nav: {
      overview: 'Overview',
      scriptCleaner: 'Script Cleaner',
      scriptChunker: 'Script Chunker',
      promptStyles: 'Prompt Styles',
      audio: 'Audio Generation',
      stockImages: 'Stock Images',
      thumbnailTester: 'Thumbnail Tester',
      settings: 'Settings',
    },
    
    // Overview Section
    overview: {
      title: 'Welcome to Image Generator',
      intro: 'This application helps you create AI-generated images for video production, particularly for historical documentaries and educational content.',
      workflow: 'Typical Workflow',
      workflowSteps: [
        { step: '1', title: 'Clean Your Script', desc: 'Remove bracketed annotations and formatting' },
        { step: '2', title: 'Chunk the Script', desc: 'Split into visual segments (20-35 words each)' },
        { step: '3', title: 'Generate Prompts', desc: 'AI creates detailed image prompts for each chunk' },
        { step: '4', title: 'Generate Audio', desc: 'Optional: Create voiceover with ElevenLabs' },
        { step: '5', title: 'Export & Generate', desc: 'Export to main generator or download CSV' },
      ],
      features: 'Key Features',
      featuresList: [
        'Multiple visual styles (Rembrandt, French Academic, Copperplate, WW2 Documentary)',
        'AI-powered prompt generation using OpenRouter',
        'ElevenLabs audio/voiceover integration',
        'Wikimedia Commons stock image search',
        'YouTube thumbnail testing tool',
      ],
    },
    
    // Script Cleaner Section
    scriptCleaner: {
      title: 'Script Cleaner',
      desc: 'The Script Cleaner removes bracketed annotations from your script, such as [Music], [Sound Effect], or stage directions.',
      howToUse: 'How to Use',
      steps: [
        'Paste your script with bracketed content into the input area',
        'Click "Clean Script" to remove all [bracketed] content',
        'The cleaned script appears in the output area',
        'Copy the cleaned script or send it directly to Script Chunker',
      ],
      tip: 'Tip',
      tipText: 'This tool is perfect for cleaning scripts exported from video editing software or transcription services that include annotations.',
    },
    
    // Script Chunker Section
    scriptChunker: {
      title: 'Script Chunker',
      desc: 'The Script Chunker is the core tool for preparing your script for image generation. It splits your script into visual segments and generates AI prompts.',
      steps: {
        step1: {
          title: 'Step 1: Input Your Script',
          items: [
            'Paste your cleaned script into the text area',
            'Or upload a .txt file',
            'You can also import directly from Script Cleaner',
          ],
        },
        step2: {
          title: 'Step 2: Chunk & Configure',
          items: [
            'Click "Chunk Script" to split into segments',
            'Each chunk is 20-35 words (optimal for image generation)',
            'Select your Environment (Medieval/Renaissance or WW2)',
            'Choose a Prompt Style that matches your content',
          ],
        },
        step3: {
          title: 'Step 3: Generate Prompts',
          items: [
            'Enable "Use AI" for high-quality prompts (requires API key)',
            'Use Test Mode to preview with fewer chunks first',
            'Click "Generate Prompts" and wait for AI processing',
            'Review and edit prompts as needed',
          ],
        },
        step4: {
          title: 'Step 4: Export',
          items: [
            'Export as CSV for external use',
            'Send directly to Image Generator',
            'Create a Project to save your work',
          ],
        },
      },
      chunkManagement: 'Chunk Management',
      chunkFeatures: [
        'Click any chunk to edit its text',
        'Split chunks that are too long',
        'Merge chunks that are too short',
        'Delete unnecessary chunks',
      ],
    },
    
    // Prompt Styles Section
    promptStyles: {
      title: 'Prompt Styles',
      desc: 'Different visual styles optimized for specific historical periods and aesthetics.',
      medieval: 'Medieval / Renaissance Styles',
      medievalStyles: [
        {
          name: 'Narrative Style',
          desc: 'Detailed narrative prompts with rich historical context. Good for complex scenes.',
        },
        {
          name: 'Director - Painting Styled',
          desc: 'Combines cinematographic direction with Rembrandt painting techniques. Recommended for most uses.',
        },
        {
          name: 'Pure Cinematic',
          desc: 'Focus on shot composition and framing. Best for action sequences.',
        },
        {
          name: 'Copperplate Etching',
          desc: '18th-century engraved print look. Cross-hatching, stipple shading, antique paper texture.',
        },
        {
          name: 'French Academic',
          desc: '19th-century museum painting style. Formal, dignified compositions with polished finish.',
        },
        {
          name: 'French Academic Dynamic',
          desc: 'Expressive version with movement, gestures, and emotional intensity. Like Géricault or Delacroix.',
        },
      ],
      ww2: 'WW2 Documentary Styles',
      ww2Styles: [
        {
          name: 'Narrative Style',
          desc: 'Detailed WW2 documentary photography descriptions.',
        },
        {
          name: 'Director - Photography Hybrid',
          desc: 'Combines directing with documentary photography techniques.',
        },
        {
          name: 'Pure Documentary',
          desc: 'Focus on authentic photojournalistic composition.',
        },
        {
          name: 'Archival Photo',
          desc: 'Authentic aged photograph look. 1940s film grain, yellowed paper, dust specks.',
        },
      ],
    },
    
    // Audio Section
    audio: {
      title: 'Audio Generation',
      desc: 'Generate professional voiceover audio using ElevenLabs text-to-speech.',
      requirements: 'Requirements',
      requirementsList: [
        'ElevenLabs API key (set in Settings)',
        'Script chunks ready in Step 2 or 3',
      ],
      howToUse: 'How to Use',
      steps: [
        'Expand the "Audio Generation" section',
        'Select a voice from the dropdown (or load your custom voices)',
        'Adjust voice settings (stability, similarity, style, speed)',
        'Click "Generate Audio for All Chunks"',
        'Preview individual chunks or combine all into one file',
        'Download the final audio',
      ],
      settings: 'Voice Settings',
      settingsDesc: [
        { name: 'Stability', desc: 'Higher = more consistent, Lower = more expressive' },
        { name: 'Similarity', desc: 'How closely to match the original voice' },
        { name: 'Style', desc: 'Amount of style exaggeration (0 = neutral)' },
        { name: 'Speed', desc: 'Playback speed multiplier' },
      ],
      tip: 'Tip',
      tipText: 'Save your favorite voice configurations as presets for quick access.',
    },
    
    // Stock Images Section
    stockImages: {
      title: 'Stock Image Finder',
      desc: 'Search Wikimedia Commons for public domain historical images.',
      howToUse: 'How to Use',
      steps: [
        'Enter search keywords related to your topic',
        'Browse the results grid',
        'Click on an image to see details and licensing',
        'Download images for use in your project',
      ],
      searchTips: 'Search Tips',
      tips: [
        'Use specific historical names (e.g., "Henry VIII portrait")',
        'Include dates or periods (e.g., "1453 Constantinople")',
        'Try location names (e.g., "Tower of London medieval")',
        'Search for specific artifacts or objects',
      ],
    },
    
    // Thumbnail Tester Section
    thumbnailTester: {
      title: 'Thumbnail Tester',
      desc: 'Preview how your YouTube thumbnails will look at different sizes and contexts.',
      howToUse: 'How to Use',
      steps: [
        'Upload or paste your thumbnail image',
        'Enter your video title',
        'See how it appears in YouTube search results',
        'Compare against competitor thumbnails',
        'Test different variations',
      ],
      tip: 'Tip',
      tipText: 'Thumbnails should be readable and eye-catching even at small sizes. Test with different background colors.',
    },
    
    // Settings Section
    settings: {
      title: 'Settings',
      desc: 'Configure your API keys and preferences.',
      apiKeys: 'API Keys',
      apiKeysList: [
        {
          name: 'OpenRouter API Key',
          desc: 'Required for AI prompt generation. Get one at openrouter.ai',
        },
        {
          name: 'fal.ai API Key',
          desc: 'Required for image generation. Get one at fal.ai',
        },
        {
          name: 'ElevenLabs API Key',
          desc: 'Required for audio generation. Get one at elevenlabs.io',
        },
      ],
      models: 'AI Model Selection',
      modelsDesc: 'Choose which AI model to use for prompt generation. Claude models are recommended for best quality.',
      security: 'Security Note',
      securityDesc: 'API keys are stored locally in your browser and never sent to our servers.',
    },
  },
  
  hu: {
    title: 'Dokumentáció',
    subtitle: 'Ismerd meg az Image Generator App használatát',
    backToApp: 'Vissza az alkalmazáshoz',
    
    // Navigation
    nav: {
      overview: 'Áttekintés',
      scriptCleaner: 'Script Tisztító',
      scriptChunker: 'Script Daraboló',
      promptStyles: 'Prompt Stílusok',
      audio: 'Hang Generálás',
      stockImages: 'Stock Képek',
      thumbnailTester: 'Thumbnail Tesztelő',
      settings: 'Beállítások',
    },
    
    // Overview Section
    overview: {
      title: 'Üdvözlünk az Image Generatorban',
      intro: 'Ez az alkalmazás segít AI-generált képeket készíteni videó produkcióhoz, különösen történelmi dokumentumfilmekhez és oktatási tartalmakhoz.',
      workflow: 'Tipikus Munkafolyamat',
      workflowSteps: [
        { step: '1', title: 'Script Tisztítása', desc: 'Szögletes zárójelben lévő megjegyzések eltávolítása' },
        { step: '2', title: 'Script Darabolása', desc: 'Felosztás vizuális szegmensekre (20-35 szó egyenként)' },
        { step: '3', title: 'Promptok Generálása', desc: 'AI részletes kép promptokat készít minden darabhoz' },
        { step: '4', title: 'Hang Generálás', desc: 'Opcionális: Narráció készítése ElevenLabs-szal' },
        { step: '5', title: 'Exportálás', desc: 'Exportálás a fő generátorba vagy CSV letöltése' },
      ],
      features: 'Főbb Funkciók',
      featuresList: [
        'Többféle vizuális stílus (Rembrandt, Francia Akadémiai, Rézkarc, WW2 Dokumentum)',
        'AI-alapú prompt generálás OpenRouter-rel',
        'ElevenLabs hang/narráció integráció',
        'Wikimedia Commons stock kép keresés',
        'YouTube thumbnail tesztelő eszköz',
      ],
    },
    
    // Script Cleaner Section
    scriptCleaner: {
      title: 'Script Tisztító',
      desc: 'A Script Tisztító eltávolítja a szögletes zárójelben lévő megjegyzéseket a scriptből, mint például [Zene], [Hangeffekt], vagy rendezői utasítások.',
      howToUse: 'Használat',
      steps: [
        'Illeszd be a scriptet a zárójelezett tartalommal a beviteli mezőbe',
        'Kattints a "Script Tisztítása" gombra az összes [zárójelezett] tartalom eltávolításához',
        'A tisztított script megjelenik a kimeneti mezőben',
        'Másold ki a tisztított scriptet vagy küldd közvetlenül a Script Darabolóba',
      ],
      tip: 'Tipp',
      tipText: 'Ez az eszköz tökéletes videószerkesztő szoftverből vagy átírási szolgáltatásokból exportált scriptek tisztítására, amelyek megjegyzéseket tartalmaznak.',
    },
    
    // Script Chunker Section
    scriptChunker: {
      title: 'Script Daraboló',
      desc: 'A Script Daraboló az alapvető eszköz a script előkészítéséhez képgeneráláshoz. Vizuális szegmensekre osztja a scriptet és AI promptokat generál.',
      steps: {
        step1: {
          title: '1. Lépés: Script Bevitele',
          items: [
            'Illeszd be a tisztított scriptet a szövegmezőbe',
            'Vagy tölts fel egy .txt fájlt',
            'Importálhatsz közvetlenül a Script Tisztítóból is',
          ],
        },
        step2: {
          title: '2. Lépés: Darabolás és Konfiguráció',
          items: [
            'Kattints a "Script Darabolása" gombra a szegmensekre osztáshoz',
            'Minden darab 20-35 szó (optimális képgeneráláshoz)',
            'Válaszd ki a Környezetet (Középkori/Reneszánsz vagy WW2)',
            'Válassz egy Prompt Stílust, ami illik a tartalomhoz',
          ],
        },
        step3: {
          title: '3. Lépés: Promptok Generálása',
          items: [
            'Engedélyezd az "AI Használata" opciót minőségi promptokhoz (API kulcs szükséges)',
            'Használd a Teszt Módot kevesebb darab előnézetéhez',
            'Kattints a "Promptok Generálása" gombra és várd meg az AI feldolgozást',
            'Ellenőrizd és szerkeszd a promptokat szükség szerint',
          ],
        },
        step4: {
          title: '4. Lépés: Exportálás',
          items: [
            'Exportálás CSV-ként külső használatra',
            'Küldés közvetlenül az Image Generatorba',
            'Projekt létrehozása a munka mentéséhez',
          ],
        },
      },
      chunkManagement: 'Darab Kezelés',
      chunkFeatures: [
        'Kattints bármelyik darabra a szöveg szerkesztéséhez',
        'Oszd fel a túl hosszú darabokat',
        'Egyesítsd a túl rövid darabokat',
        'Töröld a felesleges darabokat',
      ],
    },
    
    // Prompt Styles Section
    promptStyles: {
      title: 'Prompt Stílusok',
      desc: 'Különböző vizuális stílusok, amelyek specifikus történelmi korszakokhoz és esztétikákhoz vannak optimalizálva.',
      medieval: 'Középkori / Reneszánsz Stílusok',
      medievalStyles: [
        {
          name: 'Narratív Stílus',
          desc: 'Részletes narratív promptok gazdag történelmi kontextussal. Komplex jelenetekhez jó.',
        },
        {
          name: 'Rendezői - Festmény Stílus',
          desc: 'Cinematográfiai rendezést kombinál Rembrandt festészeti technikákkal. A legtöbb esetben ajánlott.',
        },
        {
          name: 'Tiszta Cinematikus',
          desc: 'Fókusz a beállításon és keretezésen. Akció szekvenciákhoz a legjobb.',
        },
        {
          name: 'Rézkarc',
          desc: '18. századi metszet megjelenés. Keresztsraffozás, pontozott árnyékolás, antik papír textúra.',
        },
        {
          name: 'Francia Akadémiai',
          desc: '19. századi múzeumi festmény stílus. Formális, méltóságteljes kompozíciók csiszolt befejezéssel.',
        },
        {
          name: 'Francia Akadémiai Dinamikus',
          desc: 'Expresszív verzió mozgással, gesztusokkal és érzelmi intenzitással. Mint Géricault vagy Delacroix.',
        },
      ],
      ww2: 'WW2 Dokumentum Stílusok',
      ww2Styles: [
        {
          name: 'Narratív Stílus',
          desc: 'Részletes WW2 dokumentum fotó leírások.',
        },
        {
          name: 'Rendezői - Fotó Hibrid',
          desc: 'Rendezést kombinál dokumentum fotózási technikákkal.',
        },
        {
          name: 'Tiszta Dokumentum',
          desc: 'Fókusz az autentikus újságírói kompozíción.',
        },
        {
          name: 'Archív Fotó',
          desc: 'Autentikus öregedett fotó megjelenés. 1940-es évek filmszem, sárgult papír, porszemek.',
        },
      ],
    },
    
    // Audio Section
    audio: {
      title: 'Hang Generálás',
      desc: 'Professzionális narráció hang generálása ElevenLabs text-to-speech használatával.',
      requirements: 'Követelmények',
      requirementsList: [
        'ElevenLabs API kulcs (Beállításokban megadva)',
        'Script darabok készen a 2. vagy 3. lépésben',
      ],
      howToUse: 'Használat',
      steps: [
        'Nyisd ki a "Hang Generálás" szekciót',
        'Válassz egy hangot a legördülő listából (vagy töltsd be az egyéni hangjaidat)',
        'Állítsd be a hang beállításokat (stabilitás, hasonlóság, stílus, sebesség)',
        'Kattints a "Hang Generálás Minden Darabhoz" gombra',
        'Előnézd az egyedi darabokat vagy kombináld őket egy fájlba',
        'Töltsd le a végleges hangot',
      ],
      settings: 'Hang Beállítások',
      settingsDesc: [
        { name: 'Stabilitás', desc: 'Magasabb = konzisztensebb, Alacsonyabb = expresszívebb' },
        { name: 'Hasonlóság', desc: 'Mennyire közelítsen az eredeti hanghoz' },
        { name: 'Stílus', desc: 'Stílus túlzás mértéke (0 = semleges)' },
        { name: 'Sebesség', desc: 'Lejátszási sebesség szorzó' },
      ],
      tip: 'Tipp',
      tipText: 'Mentsd el kedvenc hang konfigurációidat előbeállításként a gyors hozzáféréshez.',
    },
    
    // Stock Images Section
    stockImages: {
      title: 'Stock Kép Kereső',
      desc: 'Keress a Wikimedia Commons-on közkincs történelmi képeket.',
      howToUse: 'Használat',
      steps: [
        'Írd be a témádhoz kapcsolódó keresési kulcsszavakat',
        'Böngészd az eredmények rácsát',
        'Kattints egy képre a részletek és licenc megtekintéséhez',
        'Töltsd le a képeket a projektedhez',
      ],
      searchTips: 'Keresési Tippek',
      tips: [
        'Használj konkrét történelmi neveket (pl. "VIII. Henrik portré")',
        'Tedd hozzá a dátumokat vagy korszakokat (pl. "1453 Konstantinápoly")',
        'Próbálj helyszín neveket (pl. "Tower of London középkori")',
        'Keress konkrét tárgyakat vagy objektumokat',
      ],
    },
    
    // Thumbnail Tester Section
    thumbnailTester: {
      title: 'Thumbnail Tesztelő',
      desc: 'Előnézd, hogyan fognak kinézni a YouTube thumbnailek különböző méretekben és kontextusokban.',
      howToUse: 'Használat',
      steps: [
        'Töltsd fel vagy illeszd be a thumbnail képet',
        'Írd be a videó címét',
        'Nézd meg, hogyan jelenik meg a YouTube keresési eredményekben',
        'Hasonlítsd össze versenytárs thumbnailekkel',
        'Tesztelj különböző variációkat',
      ],
      tip: 'Tipp',
      tipText: 'A thumbnaileknek olvashatónak és figyelemfelkeltőnek kell lenniük még kis méretben is. Tesztelj különböző háttérszínekkel.',
    },
    
    // Settings Section
    settings: {
      title: 'Beállítások',
      desc: 'Konfiguráld az API kulcsaidat és preferenciáidat.',
      apiKeys: 'API Kulcsok',
      apiKeysList: [
        {
          name: 'OpenRouter API Kulcs',
          desc: 'Szükséges az AI prompt generáláshoz. Szerezz egyet: openrouter.ai',
        },
        {
          name: 'fal.ai API Kulcs',
          desc: 'Szükséges a képgeneráláshoz. Szerezz egyet: fal.ai',
        },
        {
          name: 'ElevenLabs API Kulcs',
          desc: 'Szükséges a hang generáláshoz. Szerezz egyet: elevenlabs.io',
        },
      ],
      models: 'AI Modell Választás',
      modelsDesc: 'Válaszd ki, melyik AI modellt használja a prompt generáláshoz. Claude modellek ajánlottak a legjobb minőséghez.',
      security: 'Biztonsági Megjegyzés',
      securityDesc: 'Az API kulcsok helyben tárolódnak a böngésződben és soha nem kerülnek a szervereinkre.',
    },
  },
};

export default function DocsPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [activeSection, setActiveSection] = useState<Section>('overview');
  
  const t = translations[language];
  
  const navItems: { id: Section; icon: React.ReactNode; label: string }[] = [
    { id: 'overview', icon: <Home className="h-4 w-4" />, label: t.nav.overview },
    { id: 'script-cleaner', icon: <Eraser className="h-4 w-4" />, label: t.nav.scriptCleaner },
    { id: 'script-chunker', icon: <Scissors className="h-4 w-4" />, label: t.nav.scriptChunker },
    { id: 'prompt-styles', icon: <Palette className="h-4 w-4" />, label: t.nav.promptStyles },
    { id: 'audio', icon: <Volume2 className="h-4 w-4" />, label: t.nav.audio },
    { id: 'stock-images', icon: <Globe className="h-4 w-4" />, label: t.nav.stockImages },
    { id: 'thumbnail-tester', icon: <ImageIcon className="h-4 w-4" />, label: t.nav.thumbnailTester },
    { id: 'settings', icon: <Settings className="h-4 w-4" />, label: t.nav.settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t.backToApp}
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-100">{t.title}</h1>
                <p className="text-sm text-slate-400">{t.subtitle}</p>
              </div>
            </div>
            
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-slate-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded border border-slate-700 text-sm"
              >
                <option value="en">English</option>
                <option value="hu">Magyar</option>
              </select>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800 min-h-[calc(100vh-73px)] bg-slate-900/50 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-8 max-w-4xl">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-4">{t.overview.title}</h2>
                <p className="text-slate-300 text-lg">{t.overview.intro}</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-4">{t.overview.workflow}</h3>
                <div className="space-y-3">
                  {t.overview.workflowSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {step.step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-100">{step.title}</h4>
                        <p className="text-sm text-slate-400">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-4">{t.overview.features}</h3>
                <ul className="space-y-2">
                  {t.overview.featuresList.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-300">
                      <Wand2 className="h-4 w-4 text-blue-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Script Cleaner Section */}
          {activeSection === 'script-cleaner' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.scriptCleaner.title}</h2>
                <p className="text-slate-300">{t.scriptCleaner.desc}</p>
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.scriptCleaner.howToUse}</h3>
                  <ol className="space-y-3">
                    {t.scriptCleaner.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <p className="text-amber-300 text-sm">
                  <span className="font-semibold">{t.scriptCleaner.tip}:</span> {t.scriptCleaner.tipText}
                </p>
              </div>
            </div>
          )}
          
          {/* Script Chunker Section */}
          {activeSection === 'script-chunker' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.scriptChunker.title}</h2>
                <p className="text-slate-300">{t.scriptChunker.desc}</p>
              </div>
              
              <div className="space-y-4">
                {Object.entries(t.scriptChunker.steps).map(([key, step]) => (
                  <Card key={key} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-slate-100 mb-4">{step.title}</h3>
                      <ul className="space-y-2">
                        {step.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-300">
                            <FileText className="h-4 w-4 text-blue-400 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.scriptChunker.chunkManagement}</h3>
                  <ul className="space-y-2">
                    {t.scriptChunker.chunkFeatures.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <Scissors className="h-4 w-4 text-green-400 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Prompt Styles Section */}
          {activeSection === 'prompt-styles' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.promptStyles.title}</h2>
                <p className="text-slate-300">{t.promptStyles.desc}</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-4">{t.promptStyles.medieval}</h3>
                <div className="grid gap-3">
                  {t.promptStyles.medievalStyles.map((style, idx) => (
                    <Card key={idx} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="h-4 w-4 text-purple-400" />
                          <h4 className="font-semibold text-slate-100">{style.name}</h4>
                        </div>
                        <p className="text-sm text-slate-400">{style.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-4">{t.promptStyles.ww2}</h3>
                <div className="grid gap-3">
                  {t.promptStyles.ww2Styles.map((style, idx) => (
                    <Card key={idx} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="h-4 w-4 text-green-400" />
                          <h4 className="font-semibold text-slate-100">{style.name}</h4>
                        </div>
                        <p className="text-sm text-slate-400">{style.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Audio Section */}
          {activeSection === 'audio' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.audio.title}</h2>
                <p className="text-slate-300">{t.audio.desc}</p>
              </div>
              
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">{t.audio.requirements}</h4>
                <ul className="space-y-1">
                  {t.audio.requirementsList.map((req, idx) => (
                    <li key={idx} className="text-sm text-blue-200">• {req}</li>
                  ))}
                </ul>
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.audio.howToUse}</h3>
                  <ol className="space-y-3">
                    {t.audio.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.audio.settings}</h3>
                  <div className="space-y-3">
                    {t.audio.settingsDesc.map((setting, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Badge className="bg-purple-600">{setting.name}</Badge>
                        <span className="text-sm text-slate-300">{setting.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <p className="text-amber-300 text-sm">
                  <span className="font-semibold">{t.audio.tip}:</span> {t.audio.tipText}
                </p>
              </div>
            </div>
          )}
          
          {/* Stock Images Section */}
          {activeSection === 'stock-images' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.stockImages.title}</h2>
                <p className="text-slate-300">{t.stockImages.desc}</p>
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.stockImages.howToUse}</h3>
                  <ol className="space-y-3">
                    {t.stockImages.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.stockImages.searchTips}</h3>
                  <ul className="space-y-2">
                    {t.stockImages.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <Globe className="h-4 w-4 text-green-400 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Thumbnail Tester Section */}
          {activeSection === 'thumbnail-tester' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.thumbnailTester.title}</h2>
                <p className="text-slate-300">{t.thumbnailTester.desc}</p>
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.thumbnailTester.howToUse}</h3>
                  <ol className="space-y-3">
                    {t.thumbnailTester.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <p className="text-amber-300 text-sm">
                  <span className="font-semibold">{t.thumbnailTester.tip}:</span> {t.thumbnailTester.tipText}
                </p>
              </div>
            </div>
          )}
          
          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{t.settings.title}</h2>
                <p className="text-slate-300">{t.settings.desc}</p>
              </div>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">{t.settings.apiKeys}</h3>
                  <div className="space-y-4">
                    {t.settings.apiKeysList.map((key, idx) => (
                      <div key={idx} className="p-4 bg-slate-900/50 rounded-lg">
                        <h4 className="font-semibold text-slate-100 mb-1">{key.name}</h4>
                        <p className="text-sm text-slate-400">{key.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">{t.settings.models}</h3>
                  <p className="text-slate-300">{t.settings.modelsDesc}</p>
                </CardContent>
              </Card>
              
              <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                <h4 className="font-semibold text-green-300 mb-1">{t.settings.security}</h4>
                <p className="text-sm text-green-200">{t.settings.securityDesc}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
