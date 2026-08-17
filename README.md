# 🎬 TomodachiPlayer

> Visualizador local de vídeos e mangás para Web e Mobile com suporte a extensões (estilo Mihon / Aniyomi), sincronização atômica SQLite e PWA instalável.

---

## ✨ Funcionalidades Principais

- 📱 **PWA Mobile-First**: Interface responsiva com suporte a instalação como aplicativo na tela inicial do celular.
- 🌐 **Rede Local**: Acesse seus vídeos e mangás do celular via Wi-Fi conectando diretamente ao IP do servidor local (`http://SEU_IP:3000`).
- 📁 **Scanner Automático de Arquivos**: Varredura recursiva de diretórios locais com sincronização atômica em SQLite.
  - **Vídeos**: `.mp4`, `.mkv`, `.webm`, `.avi`, `.mov`, `.m4v`
  - **Mangás / Quadrinhos**: Pastas de imagens e arquivos `.cbz`, `.cbr`, `.zip`, `.rar` (extração e renderização direta em memória sem gravação em disco).
- 🍿 **Player de Vídeo Completo**:
  - Reprodução com streaming `206 Partial Content` (busca instantânea / seek).
  - Salvamento automático de progresso a cada 10s e retomada do ponto onde parou.
  - Controles mobile de volume, busca, rewind/avançar ±10s e tela cheia.
- 📖 **Leitor de Mangá Avançado (Swiper.js)**:
  - 3 Modos de leitura: Página Simples (Manga Style - Direita p/ Esquerda), Página Dupla (Tablets/Monitores) e Modo Contínuo (Webtoon).
  - Pinch zoom e navegação otimizada com pré-carregamento.
- 🧩 **Arquitetura de Extensões (Mihon/Aniyomi Style)**:
  - Suporte a extensões TypeScript (`/extensions`) para buscar capas, sinopses e notas em APIs online (TMDB, AniList, MyAnimeList).
- 🏷️ **Gerenciador de Bibliotecas e Tags**:
  - Adicione e categorize pastas de mídias com tags coloridas personalizadas.
- 🔄 **Continuar de Onde Parou**:
  - Seção na página inicial com atalhos horizontais para continuar assistindo ou lendo suas mídias recentes.

---

## 🛠️ Stack Tecnológica

- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Tema Dark Mobile-First)
- **Banco de Dados**: [SQLite](https://sqlite.org/) via [Drizzle ORM](https://orm.drizzle.team/) & `better-sqlite3`
- **Player de Vídeo**: HTML5 + Custom Touch Overlay / Vidstack
- **Leitor de Mangá**: [Swiper.js](https://swiperjs.com/) + `sharp` + `adm-zip`
- **PWA**: `@ducanh2912/next-pwa`

---

## 🚀 Como Rodar o Projeto

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Modo Desenvolvimento (Rede Local Habilitada)
```bash
npm run dev
```
O servidor será iniciado em `http://0.0.0.0:3000`.

### 3. Modo Produção
```bash
npm run build
npm run start:local
```

---

## 📱 Como Acessar pelo Celular (Rede Local)

1. **Conecte seu computador e o celular no mesmo Wi-Fi.**
2. Inicie o servidor com `npm run dev`.
3. Copie o IP da rede local informado no cabeçalho do TomodachiPlayer (ex: `http://192.168.1.100:3000`).
4. Abra o navegador do celular (Chrome, Safari, Firefox) e acesse o endereço fornecido.
5. **Instalar como App PWA**:
   - No Android (Chrome): Toque nos 3 pontos e selecione **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.
   - No iPhone (Safari): Toque no botão de Compartilhar e selecione **"Adicionar à Tela de Início"**.

---

## 🧩 Como Criar Extensões Personalizadas

Você pode adicionar novas extensões criando arquivos TypeScript dentro da pasta `/extensions`. Cada extensão deve implementar a interface `ExtensionSource` de `@/lib/extensions/types`:

```typescript
import { ExtensionSource, MediaMetadata } from "../src/lib/extensions/types";

export const MinhaExtensao: ExtensionSource = {
  id: "minha-extensao",
  name: "Minha Fonte de Metadados",
  version: "1.0.0",
  lang: "pt-BR",

  async getMetadata(filename: string): Promise<MediaMetadata | null> {
    return {
      title: "Nome do Anime/Filme",
      coverUrl: "https://exemplo.com/capa.jpg",
      rating: 9.0,
      synopsis: "Sinopse incrível...",
    };
  },
};

export default MinhaExtensao;
```

---

## 📜 Licença

Desenvolvido para uso pessoal e entretenimento local. Licença MIT.
