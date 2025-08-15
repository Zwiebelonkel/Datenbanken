export interface Skill {
  id: number;
  name: string;
  description: string;
  price: number;
  type: 'score' | 'money'; // Typ des Multiplikators: Score oder Monetary
  level: number;            // Level des Multiplikators (1, 2, 3, ...)
  purchased: boolean;
}

export interface Player {
  skillPoints: number;
  scoreMultiplier: number;
  monetaryMultiplier: number;
}
