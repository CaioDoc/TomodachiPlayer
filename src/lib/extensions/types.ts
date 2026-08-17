export interface MediaMetadata {
  title: string;
  synopsis?: string;
  coverUrl?: string;
  rating?: number;
  tags?: string[];
  year?: number;
  author?: string;
}

export interface ExtensionSource {
  id: string;
  name: string;
  version: string;
  lang: string;
  // Busca metadados para um arquivo local específico baseado no nome do arquivo
  getMetadata(filename: string): Promise<MediaMetadata | null>;
}
