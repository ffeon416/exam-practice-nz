import type { Exam } from "@/lib/types";

import l1Reasoning2023 from "./l1-reasoning-2023.json";
import l1Reasoning2024 from "./l1-reasoning-2024.json";
import l1Reasoning2025 from "./l1-reasoning-2025.json";
import l2Algebra2024 from "./l2-algebra-2024.json";
import l2Algebra2025 from "./l2-algebra-2025.json";
import l2Calculus2024 from "./l2-calculus-2024.json";
import l2Calculus2025 from "./l2-calculus-2025.json";
import l1Stats2024 from "./l1-stats-2024.json";
import l1Stats2025 from "./l1-stats-2025.json";
import caaNumeracy2024 from "./caa-numeracy-2024.json";
import caaNumeracy2025 from "./caa-numeracy-2025.json";
import l3Complex2024 from "./l3-complex-2024.json";
import l3Complex2025 from "./l3-complex-2025.json";
import l3Differentiation2024 from "./l3-differentiation-2024.json";
import l3Differentiation2025 from "./l3-differentiation-2025.json";
import l3Integration2024 from "./l3-integration-2024.json";
import l3Integration2025 from "./l3-integration-2025.json";
import l1ScienceIdeas2024 from "./l1-science-ideas-2024.json";
import l1ScienceIdeas2025 from "./l1-science-ideas-2025.json";
import l1ScienceClaims2025 from "./l1-science-claims-2025.json";
import l1AghortSoils2024 from "./l1-aghort-soils-2024.json";
import l1AghortSoils2025 from "./l1-aghort-soils-2025.json";
import l1EnergyPhysics2024 from "./l1-energy-physics-2024.json";
import l1EnergyPhysics2025 from "./l1-energy-physics-2025.json";
import l1Genetics2025 from "./l1-genetics-2025.json";
import l1Materials2024 from "./l1-materials-2024.json";
import l1Materials2025 from "./l1-materials-2025.json";
import l1AghortSustainability2025 from "./l1-aghort-sustainability-2025.json";
import l1EarthSpace2025 from "./l1-earth-space-2025.json";
import l2BiologyLife2024 from "./l2-biology-life-2024.json";
import l2BiologyLife2025 from "./l2-biology-life-2025.json";
import l2BiologyGenetics2024 from "./l2-biology-genetics-2024.json";
import l2BiologyGenetics2025 from "./l2-biology-genetics-2025.json";
import l3BiologyBehaviour2024 from "./l3-biology-behaviour-2024.json";
import l3BiologyBehaviour2025 from "./l3-biology-behaviour-2025.json";
import l3BiologyEvolution2024 from "./l3-biology-evolution-2024.json";
import l3BiologyEvolution2025 from "./l3-biology-evolution-2025.json";
import l3PhysicsWaves2024 from "./l3-physics-waves-2024.json";
import l3PhysicsWaves2025 from "./l3-physics-waves-2025.json";
import l3PhysicsMechanics2024 from "./l3-physics-mechanics-2024.json";
import l3PhysicsMechanics2025 from "./l3-physics-mechanics-2025.json";
import l3PhysicsElectrical2024 from "./l3-physics-electrical-2024.json";
import l3PhysicsElectrical2025 from "./l3-physics-electrical-2025.json";
import l2ChemistryReactivity2024 from "./l2-chemistry-reactivity-2024.json";
import l2ChemistryReactivity2025 from "./l2-chemistry-reactivity-2025.json";
import l2ChemistryBonding2024 from "./l2-chemistry-bonding-2024.json";
import l2ChemistryBonding2025 from "./l2-chemistry-bonding-2025.json";
import l2ChemistryReactions2024 from "./l2-chemistry-reactions-2024.json";
import l2ChemistryReactions2025 from "./l2-chemistry-reactions-2025.json";
import l2PhysicsWaves2024 from "./l2-physics-waves-2024.json";
import l2PhysicsWaves2025 from "./l2-physics-waves-2025.json";
import l2PhysicsMechanics2024 from "./l2-physics-mechanics-2024.json";
import l2PhysicsMechanics2025 from "./l2-physics-mechanics-2025.json";
import l2PhysicsElectricity2025 from "./l2-physics-electricity-2025.json";
import l3ChemistryThermo2024 from "./l3-chemistry-thermo-2024.json";
import l3ChemistryThermo2025 from "./l3-chemistry-thermo-2025.json";
import l3ChemistryEquilibrium2024 from "./l3-chemistry-equilibrium-2024.json";
import l3ChemistryOrganic2024 from "./l3-chemistry-organic-2024.json";
import l3ChemistryOrganic2025 from "./l3-chemistry-organic-2025.json";
import l2AccountingFinancial2024 from "./l2-accounting-financial-2024.json";
import l2AccountingFinancial2025 from "./l2-accounting-financial-2025.json";
import l2AccountingDecisions2024 from "./l2-accounting-decisions-2024.json";
import l2AccountingDecisions2025 from "./l2-accounting-decisions-2025.json";
import l3AccountingAnalysis2024 from "./l3-accounting-analysis-2024.json";
import l3AccountingAnalysis2025 from "./l3-accounting-analysis-2025.json";
import l3AccountingCvp2024 from "./l3-accounting-cvp-2024.json";
import l3AccountingCvp2025 from "./l3-accounting-cvp-2025.json";
import l1EconomicsMarket2025 from "./l1-economics-market-2025.json";
import l1EconomicsDecisions2025 from "./l1-economics-decisions-2025.json";
import l1AccountingFinancial2025 from "./l1-accounting-financial-2025.json";
import l1AccountingTransactions2025 from "./l1-accounting-transactions-2025.json";
import l2EconomicsMarket2024 from "./l2-economics-market-2024.json";
import l2EconomicsMarket2025 from "./l2-economics-market-2025.json";
import l2EconomicsInflation2024 from "./l2-economics-inflation-2024.json";
import l2EconomicsInflation2025 from "./l2-economics-inflation-2025.json";
import l2EconomicsGrowth2024 from "./l2-economics-growth-2024.json";
import l2EconomicsGrowth2025 from "./l2-economics-growth-2025.json";
import l3EconomicsDemand2024 from "./l3-economics-demand-2024.json";
import l3EconomicsDemand2025 from "./l3-economics-demand-2025.json";
import l3EconomicsFailure2024 from "./l3-economics-failure-2024.json";
import l3EconomicsFailure2025 from "./l3-economics-failure-2025.json";
import l3EconomicsMacro2024 from "./l3-economics-macro-2024.json";
import l3EconomicsMacro2025 from "./l3-economics-macro-2025.json";
import l2GeographyEnvironment2024 from "./l2-geography-environment-2024.json";
import l2GeographyEnvironment2025 from "./l2-geography-environment-2025.json";
import l2GeographyConcepts2025 from "./l2-geography-concepts-2025.json";
import l2GeographySkills2024 from "./l2-geography-skills-2024.json";
import l2GeographySkills2025 from "./l2-geography-skills-2025.json";
import l3GeographyLandscapes2024 from "./l3-geography-landscapes-2024.json";
import l3GeographyLandscapes2025 from "./l3-geography-landscapes-2025.json";
import l3GeographyCultural2024 from "./l3-geography-cultural-2024.json";
import l3GeographyCultural2025 from "./l3-geography-cultural-2025.json";
import l3GeographyResearch2024 from "./l3-geography-research-2024.json";
import l3GeographyResearch2025 from "./l3-geography-research-2025.json";
import y10ScienceBiology2025 from "./y10-science-biology-2025.json";
import y10ScienceChemistry2025 from "./y10-science-chemistry-2025.json";
import y10SciencePhysics2025 from "./y10-science-physics-2025.json";
import y10EnglishReading2024 from "./y10-english-reading-2024.json";
import y10EnglishReading2025 from "./y10-english-reading-2025.json";
import y10EnglishWriting2025 from "./y10-english-writing-2025.json";
import l1EnglishUnfamiliar2023 from "./l1-english-unfamiliar-2023.json";
import l1EnglishUnfamiliar2024 from "./l1-english-unfamiliar-2024.json";
import l1EnglishUnfamiliar2025 from "./l1-english-unfamiliar-2025.json";
import l1EnglishStudiedText2025 from "./l1-english-studied-text-2025.json";
import l2EnglishWritten2023 from "./l2-english-written-2023.json";
import l2EnglishWritten2024 from "./l2-english-written-2024.json";
import l2EnglishVisual2023 from "./l2-english-visual-2023.json";
import l2EnglishVisual2024 from "./l2-english-visual-2024.json";
import l2EnglishUnfamiliar2023 from "./l2-english-unfamiliar-2023.json";
import l2EnglishUnfamiliar2024 from "./l2-english-unfamiliar-2024.json";
import l3EnglishWritten2023 from "./l3-english-written-2023.json";
import l3EnglishWritten2024 from "./l3-english-written-2024.json";
import l3EnglishVisual2023 from "./l3-english-visual-2023.json";
import l3EnglishVisual2024 from "./l3-english-visual-2024.json";
import l3EnglishUnfamiliar2023 from "./l3-english-unfamiliar-2023.json";
import l3EnglishUnfamiliar2024 from "./l3-english-unfamiliar-2024.json";
import y10Health2025 from "./y10-health-2025.json";
import y10Health2024 from "./y10-health-2024.json";
import y10DigitalTech2025 from "./y10-digital-tech-2025.json";
import y10SocialStudies2024 from "./y10-social-studies-2024.json";
import y10SocialStudies2025 from "./y10-social-studies-2025.json";
import l3HistoryCauses2024 from "./l3-history-causes-2024.json";
import l3HistoryCauses2025 from "./l3-history-causes-2025.json";
import l2MediaGenre2024 from "./l2-media-genre-2024.json";
import l2MediaGenre2025 from "./l2-media-genre-2025.json";
import l3MediaSociety2024 from "./l3-media-society-2024.json";
import l3MediaSociety2025 from "./l3-media-society-2025.json";
import l1TereoReading2022 from "./l1-tereo-reading-2022.json";
import l1TereoWriting2022 from "./l1-tereo-writing-2022.json";
import l2TereoReading2024 from "./l2-tereo-reading-2024.json";
import l2TereoWriting2024 from "./l2-tereo-writing-2024.json";
import l3TereoReading2024 from "./l3-tereo-reading-2024.json";
import l3TereoWriting2024 from "./l3-tereo-writing-2024.json";
import l2ClassicalIdeas2024 from "./l2-classical-ideas-2024.json";
import l2ClassicalIdeas2025 from "./l2-classical-ideas-2025.json";
import l2ClassicalArt2024 from "./l2-classical-art-2024.json";
import l2ClassicalArt2025 from "./l2-classical-art-2025.json";
import l3ClassicalIdeas2024 from "./l3-classical-ideas-2024.json";
import l3ClassicalIdeas2025 from "./l3-classical-ideas-2025.json";
import l3ClassicalArt2024 from "./l3-classical-art-2024.json";
import l3ClassicalArt2025 from "./l3-classical-art-2025.json";
import l2ArtHistoryFormal2024 from "./l2-art-history-formal-2024.json";
import l2ArtHistoryFormal2025 from "./l2-art-history-formal-2025.json";
import l3ArtHistoryStyle2024 from "./l3-art-history-style-2024.json";
import l3ArtHistoryStyle2025 from "./l3-art-history-style-2025.json";
import l3ArtHistoryMeanings2024 from "./l3-art-history-meanings-2024.json";
import l3ArtHistoryMeanings2025 from "./l3-art-history-meanings-2025.json";
import l3BusinessStudies2024 from "./l3-business-studies-2024.json";
import l3BusinessStudies2025 from "./l3-business-studies-2025.json";
import l2StatsProbability2024 from "./l2-stats-probability-2024.json";
import l2StatsProbability2025 from "./l2-stats-probability-2025.json";
import l3StatsReports2024 from "./l3-stats-reports-2024.json";
import l3StatsReports2025 from "./l3-stats-reports-2025.json";
import l3StatsProbConcepts2024 from "./l3-stats-prob-concepts-2024.json";
import l3StatsProbConcepts2025 from "./l3-stats-prob-concepts-2025.json";
import l3StatsProbDistributions2024 from "./l3-stats-prob-distributions-2024.json";
import l3StatsProbDistributions2025 from "./l3-stats-prob-distributions-2025.json";
import l1HealthWellbeing2025 from "./l1-health-wellbeing-2025.json";
import l1StatsData2025 from "./l1-stats-data-2025.json";
import l1BiologyLife2025 from "./l1-biology-life-2025.json";
import l1GeographyEnvironment2025 from "./l1-geography-environment-2025.json";
import l1GeographySkills2025 from "./l1-geography-skills-2025.json";
import l1HistoryPerspectives2025 from "./l1-history-perspectives-2025.json";
import l1HistorySources2025 from "./l1-history-sources-2025.json";

export const ALL_EXAMS: Exam[] = [
  caaNumeracy2024 as Exam,
  caaNumeracy2025 as Exam,
  l1Reasoning2023 as Exam,
  l1Reasoning2024 as Exam,
  l1Reasoning2025 as Exam,
  l1Stats2024 as Exam,
  l1Stats2025 as Exam,
  l2Algebra2024 as Exam,
  l2Algebra2025 as Exam,
  l2Calculus2024 as Exam,
  l2Calculus2025 as Exam,
  l3Complex2024 as Exam,
  l3Complex2025 as Exam,
  l3Differentiation2024 as Exam,
  l3Differentiation2025 as Exam,
  l3Integration2024 as Exam,
  l3Integration2025 as Exam,
  l1ScienceIdeas2024 as Exam,
  l1ScienceIdeas2025 as Exam,
  l1ScienceClaims2025 as Exam,
  l1AghortSoils2024 as Exam,
  l1AghortSoils2025 as Exam,
  l1EnergyPhysics2024 as Exam,
  l1EnergyPhysics2025 as Exam,
  l1Genetics2025 as Exam,
  l1Materials2024 as Exam,
  l1Materials2025 as Exam,
  l1AghortSustainability2025 as Exam,
  l1EarthSpace2025 as Exam,
  l2BiologyLife2024 as Exam,
  l2BiologyLife2025 as Exam,
  l2BiologyGenetics2024 as Exam,
  l2BiologyGenetics2025 as Exam,
  l3BiologyBehaviour2024 as Exam,
  l3BiologyBehaviour2025 as Exam,
  l3BiologyEvolution2024 as Exam,
  l3BiologyEvolution2025 as Exam,
  l3PhysicsWaves2024 as Exam,
  l3PhysicsWaves2025 as Exam,
  l3PhysicsMechanics2024 as Exam,
  l3PhysicsMechanics2025 as Exam,
  l3PhysicsElectrical2024 as Exam,
  l3PhysicsElectrical2025 as Exam,
  l2ChemistryReactivity2024 as Exam,
  l2ChemistryReactivity2025 as Exam,
  l2ChemistryBonding2024 as Exam,
  l2ChemistryBonding2025 as Exam,
  l2ChemistryReactions2024 as Exam,
  l2ChemistryReactions2025 as Exam,
  l2PhysicsWaves2024 as Exam,
  l2PhysicsWaves2025 as Exam,
  l2PhysicsMechanics2024 as Exam,
  l2PhysicsMechanics2025 as Exam,
  l2PhysicsElectricity2025 as Exam,
  l3ChemistryThermo2024 as Exam,
  l3ChemistryThermo2025 as Exam,
  l3ChemistryEquilibrium2024 as Exam,
  l3ChemistryOrganic2024 as Exam,
  l3ChemistryOrganic2025 as Exam,
  l1AccountingFinancial2025 as Exam,
  l1AccountingTransactions2025 as Exam,
  l2AccountingFinancial2024 as Exam,
  l2AccountingFinancial2025 as Exam,
  l2AccountingDecisions2024 as Exam,
  l2AccountingDecisions2025 as Exam,
  l3AccountingAnalysis2024 as Exam,
  l3AccountingAnalysis2025 as Exam,
  l3AccountingCvp2024 as Exam,
  l3AccountingCvp2025 as Exam,
  l1EconomicsMarket2025 as Exam,
  l1EconomicsDecisions2025 as Exam,
  l2EconomicsMarket2024 as Exam,
  l2EconomicsMarket2025 as Exam,
  l2EconomicsInflation2024 as Exam,
  l2EconomicsInflation2025 as Exam,
  l2EconomicsGrowth2024 as Exam,
  l2EconomicsGrowth2025 as Exam,
  l3EconomicsDemand2024 as Exam,
  l3EconomicsDemand2025 as Exam,
  l3EconomicsFailure2024 as Exam,
  l3EconomicsFailure2025 as Exam,
  l3EconomicsMacro2024 as Exam,
  l3EconomicsMacro2025 as Exam,
  l2GeographyEnvironment2024 as Exam,
  l2GeographyEnvironment2025 as Exam,
  l2GeographyConcepts2025 as Exam,
  l2GeographySkills2024 as Exam,
  l2GeographySkills2025 as Exam,
  l3GeographyLandscapes2024 as Exam,
  l3GeographyLandscapes2025 as Exam,
  l3GeographyCultural2024 as Exam,
  l3GeographyCultural2025 as Exam,
  l3GeographyResearch2024 as Exam,
  l3GeographyResearch2025 as Exam,
  y10ScienceBiology2025 as Exam,
  y10ScienceChemistry2025 as Exam,
  y10SciencePhysics2025 as Exam,
  y10EnglishReading2024 as Exam,
  y10EnglishReading2025 as Exam,
  y10EnglishWriting2025 as Exam,
  l1EnglishUnfamiliar2023 as Exam,
  l1EnglishUnfamiliar2024 as Exam,
  l1EnglishUnfamiliar2025 as Exam,
  l1EnglishStudiedText2025 as Exam,
  l2EnglishWritten2023 as Exam,
  l2EnglishWritten2024 as Exam,
  l2EnglishVisual2023 as Exam,
  l2EnglishVisual2024 as Exam,
  l2EnglishUnfamiliar2023 as Exam,
  l2EnglishUnfamiliar2024 as Exam,
  l3EnglishWritten2023 as Exam,
  l3EnglishWritten2024 as Exam,
  l3EnglishVisual2023 as Exam,
  l3EnglishVisual2024 as Exam,
  l3EnglishUnfamiliar2023 as Exam,
  l3EnglishUnfamiliar2024 as Exam,
  y10Health2024 as Exam,
  y10Health2025 as Exam,
  y10DigitalTech2025 as Exam,
  y10SocialStudies2024 as Exam,
  y10SocialStudies2025 as Exam,
  l3HistoryCauses2024 as Exam,
  l3HistoryCauses2025 as Exam,
  l2MediaGenre2024 as Exam,
  l2MediaGenre2025 as Exam,
  l3MediaSociety2024 as Exam,
  l3MediaSociety2025 as Exam,
  l1TereoReading2022 as Exam,
  l1TereoWriting2022 as Exam,
  l2TereoReading2024 as Exam,
  l2TereoWriting2024 as Exam,
  l3TereoReading2024 as Exam,
  l3TereoWriting2024 as Exam,
  l2ClassicalIdeas2024 as Exam,
  l2ClassicalIdeas2025 as Exam,
  l2ClassicalArt2024 as Exam,
  l2ClassicalArt2025 as Exam,
  l3ClassicalIdeas2024 as Exam,
  l3ClassicalIdeas2025 as Exam,
  l3ClassicalArt2024 as Exam,
  l3ClassicalArt2025 as Exam,
  l2ArtHistoryFormal2024 as Exam,
  l2ArtHistoryFormal2025 as Exam,
  l3ArtHistoryStyle2024 as Exam,
  l3ArtHistoryStyle2025 as Exam,
  l3ArtHistoryMeanings2024 as Exam,
  l3ArtHistoryMeanings2025 as Exam,
  l3BusinessStudies2024 as Exam,
  l3BusinessStudies2025 as Exam,
  l2StatsProbability2024 as Exam,
  l2StatsProbability2025 as Exam,
  l3StatsReports2024 as Exam,
  l3StatsReports2025 as Exam,
  l3StatsProbConcepts2024 as Exam,
  l3StatsProbConcepts2025 as Exam,
  l3StatsProbDistributions2024 as Exam,
  l3StatsProbDistributions2025 as Exam,
  l1HealthWellbeing2025 as Exam,
  l1StatsData2025 as Exam,
  l1BiologyLife2025 as Exam,
  l1GeographyEnvironment2025 as Exam,
  l1GeographySkills2025 as Exam,
  l1HistoryPerspectives2025 as Exam,
  l1HistorySources2025 as Exam,
];

export function getExam(id: string): Exam | undefined {
  return ALL_EXAMS.find((e) => e.id === id);
}

export function getExamsByLevel(level: number): Exam[] {
  return ALL_EXAMS.filter((e) => e.level === level);
}

export function getExamsByStandard(standard: string): Exam[] {
  return ALL_EXAMS.filter((e) => e.standard === standard);
}
