export interface AppSettings {
  maxWeights: {
    DC: number; // Développé Couché
    SDT: number; // Soulevé De Terre
    Squat: number;
  };
  importExportEnabled: boolean;
  theme: 'dark-green' | 'dark-blue' | 'dark-purple';
}