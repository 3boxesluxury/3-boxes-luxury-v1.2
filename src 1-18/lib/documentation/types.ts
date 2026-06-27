export interface DocSection {
  id: string;
  title: string;
  content: string; // HTML content
  subsections: DocSubsection[];
}

export interface DocSubsection {
  id: string;
  title: string;
  content: string; // HTML content
}

export interface DocumentationDoc {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'sop' | 'ai-strategy' | 'deployment' | 'patent';
  isConfidential: boolean;
  version: string;
  lastUpdated: string;
  sections: DocSection[];
}
