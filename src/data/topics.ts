export interface Topic {
  id: string;
  label: string;
  level: 0 | 1 | 2 | 3;
  standard?: string;
}

export const TOPICS: Topic[] = [
  // Level 1 — 91947 Demonstrate mathematical reasoning
  { id: "linear-equations", label: "Linear Equations", level: 1, standard: "91947" },
  { id: "simultaneous-equations", label: "Simultaneous Equations", level: 1, standard: "91947" },
  { id: "quadratic-equations", label: "Quadratic Equations", level: 1, standard: "91947" },
  { id: "algebraic-expressions", label: "Algebraic Expressions", level: 1, standard: "91947" },
  { id: "exponents-indices", label: "Exponents & Indices", level: 1, standard: "91947" },
  { id: "linear-graphs", label: "Linear Graphs", level: 1, standard: "91947" },
  { id: "quadratic-graphs", label: "Quadratic Graphs", level: 1, standard: "91947" },
  { id: "exponential-graphs", label: "Exponential Graphs", level: 1, standard: "91947" },
  { id: "graph-features", label: "Graph Features", level: 1, standard: "91947" },
  { id: "pythagoras", label: "Pythagoras' Theorem", level: 1, standard: "91947" },
  { id: "trigonometry", label: "Trigonometry", level: 1, standard: "91947" },
  { id: "measurement", label: "Measurement (Area, Volume, Perimeter)", level: 1, standard: "91947" },
  { id: "geometry-angles", label: "Geometry & Angles", level: 1, standard: "91947" },
  { id: "sequences-patterns", label: "Sequences & Patterns", level: 1, standard: "91947" },

  // Level 2 — 91261 Apply algebraic methods
  { id: "algebraic-expressions-l2", label: "Algebraic Expressions", level: 2, standard: "91261" },
  { id: "quadratic-methods", label: "Quadratic Methods", level: 2, standard: "91261" },
  { id: "logarithms", label: "Logarithms", level: 2, standard: "91261" },
  { id: "exponents-l2", label: "Exponents & Indices", level: 2, standard: "91261" },
  { id: "simultaneous-equations-l2", label: "Simultaneous Equations", level: 2, standard: "91261" },
  { id: "graphing-l2", label: "Graphing", level: 2, standard: "91261" },
  { id: "surds-indices", label: "Surds & Indices", level: 2, standard: "91261" },
  { id: "polynomials", label: "Polynomials", level: 2, standard: "91261" },

  // Level 2 — 91262 Apply calculus methods
  { id: "differentiation", label: "Differentiation", level: 2, standard: "91262" },
  { id: "anti-differentiation", label: "Anti-differentiation", level: 2, standard: "91262" },
  { id: "tangent-lines", label: "Tangent Lines", level: 2, standard: "91262" },
  { id: "kinematics", label: "Kinematics", level: 2, standard: "91262" },
  { id: "optimisation", label: "Optimisation", level: 2, standard: "91262" },
  { id: "graph-sketching-calculus", label: "Graph Sketching (Calculus)", level: 2, standard: "91262" },
  { id: "stationary-points", label: "Stationary Points", level: 2, standard: "91262" },
  { id: "rates-of-change", label: "Rates of Change", level: 2, standard: "91262" },

  // Level 1 — 91946 Interpret and apply mathematical and statistical information
  { id: "data-interpretation", label: "Data Interpretation", level: 1, standard: "91946" },
  { id: "statistical-reasoning", label: "Statistical Reasoning", level: 1, standard: "91946" },
  { id: "time-series", label: "Time Series", level: 1, standard: "91946" },
  { id: "probability-reasoning", label: "Probability & Reasoning", level: 1, standard: "91946" },
  { id: "numerical-reasoning", label: "Numerical Reasoning in Context", level: 1 },

  // Year 10 — 32406 CAA Numeracy
  { id: "graph-reading", label: "Reading Graphs", level: 0, standard: "32406" },
  { id: "percentages", label: "Percentages", level: 0, standard: "32406" },
  { id: "fractions", label: "Fractions", level: 0, standard: "32406" },
  { id: "estimation", label: "Estimation", level: 0, standard: "32406" },
  { id: "unit-conversion", label: "Unit Conversion", level: 0, standard: "32406" },
  { id: "probability", label: "Probability", level: 0, standard: "32406" },
  { id: "patterns", label: "Patterns & Sequences", level: 0, standard: "32406" },
  { id: "symmetry", label: "Symmetry", level: 0, standard: "32406" },
  { id: "spatial-reasoning", label: "Spatial Reasoning", level: 0, standard: "32406" },
  { id: "rates", label: "Rates & Ratios", level: 0, standard: "32406" },
  { id: "tables", label: "Reading Tables", level: 0, standard: "32406" },
  { id: "division", label: "Division", level: 0, standard: "32406" },
  { id: "multiplication", label: "Multiplication", level: 0, standard: "32406" },
  { id: "time-calculations", label: "Time Calculations", level: 0, standard: "32406" },
  { id: "money-calculations", label: "Money & Discounts", level: 0, standard: "32406" },

  // Level 3 — 91577 Apply the algebra of complex numbers
  { id: "complex-numbers", label: "Complex Numbers", level: 3, standard: "91577" },
  { id: "complex-algebra", label: "Complex Algebra", level: 3, standard: "91577" },
  { id: "polar-form", label: "Polar Form", level: 3, standard: "91577" },
  { id: "de-moivres", label: "De Moivre's Theorem", level: 3, standard: "91577" },
  { id: "loci", label: "Loci", level: 3, standard: "91577" },

  // Level 3 — 91578 Apply differentiation methods
  { id: "differentiation-l3", label: "Differentiation", level: 3, standard: "91578" },
  { id: "chain-rule", label: "Chain Rule", level: 3, standard: "91578" },
  { id: "product-rule", label: "Product Rule", level: 3, standard: "91578" },
  { id: "quotient-rule", label: "Quotient Rule", level: 3, standard: "91578" },
  { id: "implicit-differentiation", label: "Implicit Differentiation", level: 3, standard: "91578" },
  { id: "related-rates", label: "Related Rates", level: 3, standard: "91578" },
  { id: "optimisation-l3", label: "Optimisation", level: 3, standard: "91578" },
  { id: "trig-differentiation", label: "Trig Differentiation", level: 3, standard: "91578" },

  // Level 3 — 91579 Apply integration methods
  { id: "integration", label: "Integration", level: 3, standard: "91579" },
  { id: "integration-techniques", label: "Integration Techniques", level: 3, standard: "91579" },
  { id: "definite-integrals", label: "Definite Integrals", level: 3, standard: "91579" },
  { id: "area-under-curves", label: "Area Under Curves", level: 3, standard: "91579" },
  { id: "differential-equations", label: "Differential Equations", level: 3, standard: "91579" },
  { id: "trig-integration", label: "Trig Integration", level: 3, standard: "91579" },

  // Year 10 — Y10-ENG-READ Reading Comprehension
  { id: "language-features-y10", label: "Language Features", level: 0, standard: "Y10-ENG-READ" },
  { id: "unfamiliar-texts-y10", label: "Unfamiliar Texts", level: 0, standard: "Y10-ENG-READ" },
  { id: "non-fiction-y10", label: "Non-fiction", level: 0, standard: "Y10-ENG-READ" },
  { id: "poetry-y10", label: "Poetry", level: 0, standard: "Y10-ENG-READ" },
  { id: "prose-y10", label: "Prose", level: 0, standard: "Y10-ENG-READ" },

  // Year 10 — Y10-SCI-BIO Biology
  { id: "cells-biology", label: "Cell Structure", level: 0, standard: "Y10-SCI-BIO" },
  { id: "genetics-y10", label: "Genetics Basics", level: 0, standard: "Y10-SCI-BIO" },
  { id: "ecosystems-y10", label: "Ecosystems", level: 0, standard: "Y10-SCI-BIO" },
  { id: "human-body-y10", label: "Human Body Systems", level: 0, standard: "Y10-SCI-BIO" },
  { id: "nz-ecology", label: "NZ Ecology & Conservation", level: 0, standard: "Y10-SCI-BIO" },

  // Year 10 — Y10-SCI-CHEM Chemistry
  { id: "atoms-elements", label: "Atoms & Elements", level: 0, standard: "Y10-SCI-CHEM" },
  { id: "chemical-reactions-y10", label: "Chemical Reactions", level: 0, standard: "Y10-SCI-CHEM" },
  { id: "acids-bases", label: "Acids & Bases", level: 0, standard: "Y10-SCI-CHEM" },
  { id: "mixtures-separation", label: "Mixtures & Separation", level: 0, standard: "Y10-SCI-CHEM" },
  { id: "chemical-bonding-y10", label: "Chemical Bonding", level: 0, standard: "Y10-SCI-CHEM" },

  // Year 10 — Y10-SCI-PHYS Physics
  { id: "forces-motion-y10", label: "Forces & Motion", level: 0, standard: "Y10-SCI-PHYS" },
  { id: "energy-y10", label: "Energy", level: 0, standard: "Y10-SCI-PHYS" },
  { id: "electricity-y10", label: "Electricity", level: 0, standard: "Y10-SCI-PHYS" },
  { id: "waves-y10", label: "Waves", level: 0, standard: "Y10-SCI-PHYS" },

  // Level 1 — 91927 Unfamiliar Texts (English)
  { id: "language-features", label: "Language Features", level: 1, standard: "91927" },
  { id: "unfamiliar-texts", label: "Unfamiliar Texts", level: 1, standard: "91927" },
  { id: "non-fiction", label: "Non-fiction", level: 1, standard: "91927" },
  { id: "poetry", label: "Poetry", level: 1, standard: "91927" },
  { id: "prose", label: "Prose", level: 1, standard: "91927" },

  // Level 1 — 91925 Studied Text (English)
  { id: "studied-text", label: "Studied Text", level: 1, standard: "91925" },
  { id: "character-analysis", label: "Character Analysis", level: 1, standard: "91925" },
  { id: "ideas-themes", label: "Ideas & Themes", level: 1, standard: "91925" },
  { id: "conflict-tension", label: "Conflict & Tension", level: 1, standard: "91925" },
  { id: "language-techniques", label: "Language Techniques", level: 1, standard: "91925" },
  { id: "personal-response", label: "Personal Response", level: 1, standard: "91925" },

  // Level 2 — 91098 Analyse written text(s) (English)
  { id: "written-text", label: "Written Text Analysis", level: 2, standard: "91098" },
  { id: "language-features-l2", label: "Language Features", level: 2, standard: "91098" },
  { id: "close-reading-l2w", label: "Close Reading", level: 2, standard: "91098" },

  // Level 2 — 91099 Analyse visual or oral text(s) (English)
  { id: "visual-text", label: "Visual/Oral Text Analysis", level: 2, standard: "91099" },

  // Level 2 — 91100 Analyse unfamiliar written text(s) (English)
  { id: "unfamiliar-texts-l2", label: "Unfamiliar Texts", level: 2, standard: "91100" },
  { id: "close-reading", label: "Close Reading", level: 2, standard: "91100" },

  // Level 3 — 91472 Respond critically to written text(s)
  { id: "written-text-l3", label: "Written Text Analysis", level: 3, standard: "91472" },
  { id: "critical-response", label: "Critical Response", level: 3, standard: "91472" },

  // Level 3 — 91473 Respond critically to visual or oral text(s)
  { id: "visual-text-l3", label: "Visual/Oral Text Analysis", level: 3, standard: "91473" },

  // Level 3 — 91474 Unfamiliar written texts (close reading)
  { id: "unfamiliar-texts-l3", label: "Unfamiliar Texts (L3)", level: 3, standard: "91474" },

  // Year 10 — Y10-HEALTH Health
  { id: "hauora", label: "Hauora (Te Whare Tapa Whā)", level: 0, standard: "Y10-HEALTH" },
  { id: "nutrition-health", label: "Nutrition", level: 0, standard: "Y10-HEALTH" },
  { id: "drugs-alcohol", label: "Drugs & Alcohol", level: 0, standard: "Y10-HEALTH" },
  { id: "mental-health-y10", label: "Mental Health", level: 0, standard: "Y10-HEALTH" },
  { id: "relationships-health", label: "Relationships", level: 0, standard: "Y10-HEALTH" },
  { id: "fitness-body-systems", label: "Fitness & Body Systems", level: 0, standard: "Y10-HEALTH" },
  { id: "risk-taking", label: "Risk-taking Behaviour", level: 0, standard: "Y10-HEALTH" },
  { id: "community-health", label: "Community Health", level: 0, standard: "Y10-HEALTH" },

  // Year 10 — Y10-DTECH Digital Technologies
  { id: "web-development", label: "Web Development", level: 0, standard: "Y10-DTECH" },
  { id: "computational-thinking", label: "Computational Thinking", level: 0, standard: "Y10-DTECH" },
  { id: "digital-basics", label: "Digital Basics", level: 0, standard: "Y10-DTECH" },
  { id: "digital-citizenship", label: "Digital Citizenship", level: 0, standard: "Y10-DTECH" },

  // Year 10 — Y10-SOC Social Studies
  { id: "treaty-of-waitangi", label: "Treaty of Waitangi", level: 0, standard: "Y10-SOC" },
  { id: "nz-government", label: "NZ Government", level: 0, standard: "Y10-SOC" },
  { id: "economics-basics", label: "Economics Basics", level: 0, standard: "Y10-SOC" },
  { id: "social-issues-nz", label: "Social Issues in NZ", level: 0, standard: "Y10-SOC" },
  { id: "globalisation", label: "Globalisation", level: 0, standard: "Y10-SOC" },
  { id: "nz-history", label: "NZ History", level: 0, standard: "Y10-SOC" },
  { id: "rights-responsibilities", label: "Rights & Responsibilities", level: 0, standard: "Y10-SOC" },
  { id: "cultural-diversity-nz", label: "Cultural Diversity in NZ", level: 0, standard: "Y10-SOC" },
  { id: "global-issues", label: "Global Issues", level: 0, standard: "Y10-SOC" },

  // Level 1 — 91934H Health: Well-being
  { id: "hauora-l1", label: "Hauora (Te Whare Tapa Whā)", level: 1, standard: "91934H" },
  { id: "determinants-health", label: "Determinants of Health", level: 1, standard: "91934H" },
  { id: "wellbeing-nz", label: "Well-being in NZ", level: 1, standard: "91934H" },
  { id: "drugs-alcohol-l1", label: "Drugs & Alcohol", level: 1, standard: "91934H" },
  { id: "relationships-l1", label: "Relationships & Consent", level: 1, standard: "91934H" },
  { id: "mental-health-l1", label: "Mental Health", level: 1, standard: "91934H" },
  { id: "health-safety-law", label: "Health & Safety Law", level: 1, standard: "91934H" },

  // Level 1 — 91944S Statistics: Data & Probability
  { id: "measures-centre", label: "Measures of Centre", level: 1, standard: "91944S" },
  { id: "data-display", label: "Data Display", level: 1, standard: "91944S" },
  { id: "sampling-stats", label: "Sampling", level: 1, standard: "91944S" },
  { id: "probability-l1", label: "Probability", level: 1, standard: "91944S" },
  { id: "data-types", label: "Data Types", level: 1, standard: "91944S" },
  { id: "statistical-literacy", label: "Statistical Literacy", level: 1, standard: "91944S" },

  // Level 1 — 91928B Biology: Life Processes
  { id: "cells-l1", label: "Cell Structure & Function", level: 1, standard: "91928B" },
  { id: "genetics-l1", label: "Genetics", level: 1, standard: "91928B" },
  { id: "ecology-l1", label: "Ecology & Food Webs", level: 1, standard: "91928B" },
  { id: "evolution-l1", label: "Evolution & Natural Selection", level: 1, standard: "91928B" },
  { id: "nz-biodiversity", label: "NZ Biodiversity", level: 1, standard: "91928B" },

  // Level 1 — 91930 Soil properties in primary production
  { id: "soil-properties", label: "Soil Properties", level: 1, standard: "91930" },
  { id: "soil-management", label: "Soil Management", level: 1, standard: "91930" },
  { id: "primary-production", label: "Primary Production", level: 1, standard: "91930" },

  // Level 3 — 91438 Analyse the causes and consequences of a significant historical event
  { id: "causes-and-consequences", label: "Causes & Consequences", level: 3, standard: "91438" },
  { id: "historical-argument", label: "Historical Argument", level: 3, standard: "91438" },
  { id: "evidence-use", label: "Use of Evidence", level: 3, standard: "91438" },
  { id: "essay-writing", label: "Essay Writing", level: 3, standard: "91438" },

  // Level 2 — 91251 Demonstrate understanding of an aspect of a media genre
  { id: "genre-conventions", label: "Genre Conventions", level: 2, standard: "91251" },
  { id: "genre-change", label: "Genre Change & Evolution", level: 2, standard: "91251" },
  { id: "audience-genre", label: "Audience & Genre", level: 2, standard: "91251" },
  { id: "media-essay-writing", label: "Media Essay Writing", level: 2, standard: "91251" },

  // Level 3 — 91493 Demonstrate understanding of a relationship between a media genre and society
  { id: "genre-society-relationship", label: "Genre & Society Relationship", level: 3, standard: "91493" },
  { id: "societal-impact", label: "Societal Impact of Genre", level: 3, standard: "91493" },

  // Level 1 — 91087 Pānui kia mōhio ki te reo o tōna ao (Te Reo Māori Reading)
  { id: "panui-reading-l1", label: "Pānui (Reading)", level: 1, standard: "91087" },
  { id: "tikanga-maori-l1", label: "Tikanga Māori", level: 1, standard: "91087" },
  { id: "comprehension-l1", label: "Reading Comprehension", level: 1, standard: "91087" },
  { id: "whakaaro-feelings-l1", label: "Whakaaro & Kare ā-roto", level: 1, standard: "91087" },
  { id: "whakataukī-l1", label: "Whakataukī (Proverbs)", level: 1, standard: "91087" },

  // Level 1 — 91088 Tuhi i te reo o tōna ao (Te Reo Māori Writing)
  { id: "tuhituhi-writing-l1", label: "Tuhituhi (Writing)", level: 1, standard: "91088" },
  { id: "reo-expression-l1", label: "Reo Expression", level: 1, standard: "91088" },

  // Level 2 — 91286 Pānui kia mōhio ki te reo o te ao torotoro (Te Reo Māori Reading)
  { id: "panui-reading-l2", label: "Pānui (Reading)", level: 2, standard: "91286" },
  { id: "whakaaro-opinion-l2", label: "Whakaaro & Opinion", level: 2, standard: "91286" },
  { id: "tikanga-maori-l2", label: "Tikanga Māori", level: 2, standard: "91286" },
  { id: "rautaki-strategy-l2", label: "Rautaki (Strategy)", level: 2, standard: "91286" },

  // Level 2 — 91287 Tuhi i te reo o te ao torotoro (Te Reo Māori Writing)
  { id: "tuhituhi-writing-l2", label: "Tuhituhi (Writing)", level: 2, standard: "91287" },
  { id: "reo-expression-l2", label: "Reo Expression", level: 2, standard: "91287" },

  // Level 3 — 91652 Pānui kia mōhio ki te reo Māori o te ao whānui (Te Reo Māori Reading)
  { id: "panui-reading-l3", label: "Pānui (Reading)", level: 3, standard: "91652" },
  { id: "hitori-history-l3", label: "Hītori (History)", level: 3, standard: "91652" },
  { id: "comprehension-l3", label: "Reading Comprehension", level: 3, standard: "91652" },
  { id: "tikanga-maori-l3", label: "Tikanga Māori", level: 3, standard: "91652" },
  { id: "whakaaro-opinion-l3", label: "Whakaaro & Opinion", level: 3, standard: "91652" },

  // Level 3 — 91653 Tuhi i te reo Māori o te ao whānui (Te Reo Māori Writing)
  { id: "tuhituhi-writing-l3", label: "Tuhituhi (Writing)", level: 3, standard: "91653" },
  { id: "reo-expression-l3", label: "Reo Expression", level: 3, standard: "91653" },

  // Level 2 — 91200 Examine ideas and values of the classical world
  { id: "classical-ideas-values", label: "Classical Ideas & Values", level: 2, standard: "91200" },
  { id: "classical-literary-texts", label: "Classical Literary Texts", level: 2, standard: "91200" },
  { id: "classical-society", label: "Classical Society", level: 2, standard: "91200" },

  // Level 2 — 91201 Examine the significance of features of work(s) of art in the classical world
  { id: "classical-art-works", label: "Classical Art Works", level: 2, standard: "91201" },
  { id: "classical-architecture", label: "Classical Architecture", level: 2, standard: "91201" },

  // Level 3 — 91394 Analyse ideas and values of the classical world
  { id: "classical-analysis", label: "Classical Analysis", level: 3, standard: "91394" },

  // Level 3 — 91395 Analyse the significance of a work(s) of art in the classical world

  // Level 2 — 91180 Examine the effects of formal elements of art works
  { id: "formal-elements", label: "Formal Elements", level: 2, standard: "91180" },
  { id: "art-analysis", label: "Art Analysis", level: 2, standard: "91180" },
  { id: "art-periods", label: "Art Periods", level: 2, standard: "91180" },

  // Level 3 — 91482 Demonstrate understanding of style in art works
  { id: "art-style", label: "Style in Art Works", level: 3, standard: "91482" },
  { id: "stylistic-characteristics", label: "Stylistic Characteristics", level: 3, standard: "91482" },
  { id: "art-comparison", label: "Art Comparison", level: 3, standard: "91482" },

  // Level 3 — 91483 Examine how meanings are communicated through art works
  { id: "art-meanings", label: "Meanings in Art Works", level: 3, standard: "91483" },
  { id: "art-features", label: "Art Features", level: 3, standard: "91483" },
  { id: "art-context", label: "Art Context", level: 3, standard: "91483" },

  // Level 2 — 91267 Apply probability methods in solving problems
  { id: "probability-trees", label: "Probability Trees", level: 2, standard: "91267" },
  { id: "conditional-probability", label: "Conditional Probability", level: 2, standard: "91267" },
  { id: "two-way-tables", label: "Two-way Tables", level: 2, standard: "91267" },
  { id: "probability-calculations", label: "Probability Calculations", level: 2, standard: "91267" },
  { id: "expected-value", label: "Expected Value", level: 2, standard: "91267" },
  { id: "independence", label: "Independence", level: 2, standard: "91267" },
  { id: "relative-risk", label: "Relative Risk", level: 2, standard: "91267" },
  { id: "risk-interpretation", label: "Risk Interpretation", level: 2, standard: "91267" },

  // Level 3 — 91585 Apply probability concepts in solving problems
  { id: "binomial-distribution", label: "Binomial Distribution", level: 3, standard: "91585" },
  { id: "probability-concepts-l3", label: "Probability Concepts", level: 3, standard: "91585" },
  { id: "expected-value-l3", label: "Expected Value", level: 3, standard: "91585" },
  { id: "conditional-probability-l3", label: "Conditional Probability", level: 3, standard: "91585" },
  { id: "normal-distribution", label: "Normal Distribution", level: 3, standard: "91585" },
  { id: "poisson-distribution", label: "Poisson Distribution", level: 3, standard: "91585" },

  // Level 3 — 91586 Apply probability distributions in solving problems
  { id: "normal-distribution-l3", label: "Normal Distribution", level: 3, standard: "91586" },
  { id: "inverse-normal", label: "Inverse Normal", level: 3, standard: "91586" },
  { id: "probability-distributions", label: "Probability Distributions", level: 3, standard: "91586" },
  { id: "continuous-distributions", label: "Continuous Distributions", level: 3, standard: "91586" },
  { id: "exponential-distribution", label: "Exponential Distribution", level: 3, standard: "91586" },

  // Level 3 — 91584 Evaluate statistically based reports
  { id: "margin-of-error", label: "Margin of Error", level: 3, standard: "91584" },
  { id: "confidence-intervals", label: "Confidence Intervals", level: 3, standard: "91584" },
  { id: "sampling-methods", label: "Sampling Methods", level: 3, standard: "91584" },
  { id: "sampling-bias", label: "Sampling Bias", level: 3, standard: "91584" },
  { id: "evaluating-claims", label: "Evaluating Claims", level: 3, standard: "91584" },
  { id: "statistical-significance", label: "Statistical Significance", level: 3, standard: "91584" },
  { id: "study-design", label: "Study Design", level: 3, standard: "91584" },
  { id: "confounding-variables", label: "Confounding Variables", level: 3, standard: "91584" },
  { id: "statistical-reasoning-l3", label: "Statistical Reasoning", level: 3, standard: "91584" },

  // Level 1 — 91924E Economics internal standards
  { id: "market-concepts-l1", label: "Market Concepts", level: 1, standard: "91924E" },
  { id: "scarcity-choice", label: "Scarcity & Choice", level: 1, standard: "91924E" },
  { id: "supply-demand-l1", label: "Supply & Demand", level: 1, standard: "91924E" },
  { id: "government-role-l1", label: "Government Role in the Economy", level: 1, standard: "91924E" },
  { id: "consumer-decisions-l1", label: "Consumer Decisions", level: 1, standard: "91924E" },

  // Level 1 — 91924A Accounting internal standards
  { id: "financial-statements-l1", label: "Financial Statements", level: 1, standard: "91924A" },
  { id: "accounting-equation", label: "Accounting Equation", level: 1, standard: "91924A" },
  { id: "transactions-l1", label: "Processing Transactions", level: 1, standard: "91924A" },
  { id: "gst-calculations", label: "GST Calculations", level: 1, standard: "91924A" },
  { id: "source-documents-l1", label: "Source Documents", level: 1, standard: "91924A" },

  // Level 1 — 91932 Geography: Natural Environment
  { id: "natural-hazards-l1", label: "Natural Hazards", level: 1, standard: "91932" },
  { id: "tectonic-processes-l1", label: "Tectonic Processes", level: 1, standard: "91932" },
  { id: "weathering-erosion-l1", label: "Weathering & Erosion", level: 1, standard: "91932" },
  { id: "landscape-processes-l1", label: "Landscape Processes", level: 1, standard: "91932" },
  { id: "climate-change-l1", label: "Climate Change", level: 1, standard: "91932" },
  { id: "map-skills-l1", label: "Map Skills", level: 1, standard: "91932" },

  // Level 1 — 91932B Geography: Geographic Skills
  { id: "contour-lines-l1", label: "Contour Lines", level: 1, standard: "91932B" },
  { id: "scale-calculations-l1", label: "Scale Calculations", level: 1, standard: "91932B" },
  { id: "compass-directions-l1", label: "Compass Directions", level: 1, standard: "91932B" },
  { id: "grid-references-l1", label: "Grid References", level: 1, standard: "91932B" },
  { id: "data-interpretation-l1", label: "Data Interpretation", level: 1, standard: "91932B" },
  { id: "spatial-patterns-l1", label: "Spatial Patterns", level: 1, standard: "91932B" },
  { id: "photo-interpretation-l1", label: "Photo Interpretation", level: 1, standard: "91932B" },
  { id: "cross-sections-l1", label: "Cross-sections", level: 1, standard: "91932B" },
  { id: "geographic-concepts-l1", label: "Geographic Concepts", level: 1, standard: "91932B" },

  // Level 1 — 91933 History: Historical Perspectives
  { id: "nz-womens-suffrage-l1", label: "NZ Women's Suffrage", level: 1, standard: "91933" },
  { id: "key-events-l1", label: "Key Events in NZ History", level: 1, standard: "91933" },
  { id: "treaty-of-waitangi-l1", label: "Treaty of Waitangi", level: 1, standard: "91933" },
  { id: "nz-land-wars-l1", label: "NZ Land Wars", level: 1, standard: "91933" },
  { id: "causes-consequences-l1", label: "Causes & Consequences", level: 1, standard: "91933" },
  { id: "historical-sources-l1", label: "Historical Sources", level: 1, standard: "91933" },
  { id: "springbok-tour-l1", label: "1981 Springbok Tour", level: 1, standard: "91933" },
  { id: "historical-perspectives-l1", label: "Historical Perspectives", level: 1, standard: "91933" },
  { id: "crown-maori-relations-l1", label: "Crown–Māori Relations", level: 1, standard: "91933" },

  // Level 1 — 91933B History: Using Historical Sources
  { id: "source-types-l1", label: "Source Types", level: 1, standard: "91933B" },
  { id: "source-analysis-l1", label: "Source Analysis", level: 1, standard: "91933B" },
  { id: "reliability-bias-l1", label: "Reliability & Bias", level: 1, standard: "91933B" },
  { id: "dawn-raids-l1", label: "Dawn Raids", level: 1, standard: "91933B" },
  { id: "bastion-point-l1", label: "Bastion Point", level: 1, standard: "91933B" },
  { id: "nuclear-free-nz-l1", label: "Nuclear-Free NZ", level: 1, standard: "91933B" },
  { id: "comparing-sources-l1", label: "Comparing Sources", level: 1, standard: "91933B" },

  // Level 3 — 91381 Apply business knowledge to address a complex problem(s)
  { id: "global-business", label: "Global Business", level: 3, standard: "91381" },
  { id: "market-analysis", label: "Market Analysis", level: 3, standard: "91381" },
  { id: "profit-impact", label: "Profit Impact", level: 3, standard: "91381" },
  { id: "supply-chain", label: "Supply Chain", level: 3, standard: "91381" },
  { id: "market-share", label: "Market Share", level: 3, standard: "91381" },
  { id: "distribution", label: "Distribution", level: 3, standard: "91381" },
  { id: "business-decisions", label: "Business Decisions", level: 3, standard: "91381" },
  { id: "sustainability", label: "Sustainability", level: 3, standard: "91381" },
  { id: "manufacturing", label: "Manufacturing", level: 3, standard: "91381" },
  { id: "quality-management", label: "Quality Management", level: 3, standard: "91381" },
  { id: "trade-agreements", label: "Trade Agreements", level: 3, standard: "91381" },
  { id: "technology", label: "Technology", level: 3, standard: "91381" },
];

export const STANDARDS: Record<string, { label: string; level: number }> = {
  "32406": { label: "Apply mathematics and statistics in everyday situations", level: 0 },
  "91156": { label: "Life processes and ecology", level: 2 },
  "91157": { label: "Genetic variation and change", level: 2 },
  "91164": { label: "Chemical reactivity", level: 2 },
  "91165": { label: "Chemical bonding", level: 2 },
  "91166": { label: "Chemical reactions", level: 2 },
  "91170": { label: "Wave behaviour", level: 2 },
  "91171": { label: "Mechanics", level: 2 },
  "91173": { label: "Electricity and electromagnetism", level: 2 },
  "91603": { label: "Animal behaviour", level: 3 },
  "91605": { label: "Evolutionary processes", level: 3 },
  "91390": { label: "Thermochemistry", level: 3 },
  "91391": { label: "Organic chemistry", level: 3 },
  "91392": { label: "Equilibrium", level: 3 },
  "91523": { label: "Wave systems", level: 3 },
  "91524": { label: "Mechanical systems", level: 3 },
  "91526": { label: "Electrical systems", level: 3 },
  "91240": { label: "Natural environment processes", level: 2 },
  "91242": { label: "Geographic concepts", level: 2 },
  "91243": { label: "Geographic skills and ideas", level: 2 },
  "91426": { label: "Natural landscapes", level: 3 },
  "91427": { label: "Cultural processes and environments", level: 3 },
  "91429": { label: "Geographic research", level: 3 },
  "91174": { label: "Accounting - Financial statements", level: 2 },
  "91176": { label: "Accounting - Decision making", level: 2 },
  "91404": { label: "Accounting - Company financial statement analysis", level: 3 },
  "91406": { label: "Accounting - Cost-volume-profit analysis", level: 3 },
  "91222": { label: "Economics - Market", level: 2 },
  "91223": { label: "Economics - Inflation", level: 2 },
  "91224": { label: "Economics - Growth", level: 2 },
  "91399": { label: "Economics - Demand and supply", level: 3 },
  "91400": { label: "Economics - Market failure", level: 3 },
  "91403": { label: "Economics - Macro-economic influences", level: 3 },
  "91098": { label: "Analyse written text(s)", level: 2 },
  "91099": { label: "Analyse visual or oral text(s)", level: 2 },
  "91100": { label: "Analyse unfamiliar written text(s)", level: 2 },
  "91472": { label: "Respond critically to written text(s)", level: 3 },
  "91473": { label: "Respond critically to visual or oral text(s)", level: 3 },
  "91474": { label: "Respond critically to unfamiliar written texts", level: 3 },
  "Y10-SCI-BIO": { label: "Biology", level: 0 },
  "Y10-SCI-CHEM": { label: "Chemistry", level: 0 },
  "Y10-SCI-PHYS": { label: "Physics", level: 0 },
  "Y10-HEALTH": { label: "Health", level: 0 },
  "Y10-DTECH": { label: "Digital Technologies", level: 0 },
  "Y10-SOC": { label: "Social Studies", level: 0 },
  "Y10-ENG-READ": { label: "Reading Comprehension", level: 0 },
  "Y10-ENG-WRITE": { label: "Writing Skills", level: 0 },
  "91925": { label: "Studied Text", level: 1 },
  "91927": { label: "Unfamiliar Texts", level: 1 },
  "91922": { label: "Describe features of science ideas", level: 1 },
  "91923": { label: "Science-related claims", level: 1 },
  "91930": { label: "Soil properties in primary production", level: 1 },
  "91931": { label: "Environmental sustainability in primary production", level: 1 },
  "92022": { label: "Genetic variation", level: 1 },
  "92023": { label: "Physical properties of materials", level: 1 },
  "92046": { label: "Sun/Earth/Moon interactions", level: 1 },
  "92047": { label: "Energy concepts in physical systems", level: 1 },
  "91577": { label: "Apply the algebra of complex numbers", level: 3 },
  "91578": { label: "Apply differentiation methods in solving problems", level: 3 },
  "91579": { label: "Apply integration methods in solving problems", level: 3 },
  "91947": { label: "Demonstrate mathematical reasoning", level: 1 },
  "91261": { label: "Apply algebraic methods in solving problems", level: 2 },
  "91262": { label: "Apply calculus methods in solving problems", level: 2 },
  "91946": { label: "Interpret and apply mathematical and statistical information in context", level: 1 },
  "91438": { label: "Analyse the causes and consequences of a significant historical event", level: 3 },
  "91251": { label: "Demonstrate understanding of an aspect of a media genre", level: 2 },
  "91493": { label: "Demonstrate understanding of a relationship between a media genre and society", level: 3 },
  "91087": { label: "Pānui kia mōhio ki te reo o tōna ao", level: 1 },
  "91088": { label: "Tuhi i te reo o tōna ao", level: 1 },
  "91286": { label: "Pānui kia mōhio ki te reo o te ao torotoro", level: 2 },
  "91287": { label: "Tuhi i te reo o te ao torotoro", level: 2 },
  "91652": { label: "Pānui kia mōhio ki te reo Māori o te ao whānui", level: 3 },
  "91653": { label: "Tuhi i te reo Māori o te ao whānui", level: 3 },
  "91200": { label: "Examine ideas and values of the classical world", level: 2 },
  "91201": { label: "Examine the significance of features of work(s) of art in the classical world", level: 2 },
  "91394": { label: "Analyse ideas and values of the classical world", level: 3 },
  "91395": { label: "Analyse the significance of a work(s) of art in the classical world", level: 3 },
  "91180": { label: "Examine the effects of formal elements of art works", level: 2 },
  "91482": { label: "Demonstrate understanding of style in art works", level: 3 },
  "91483": { label: "Examine how meanings are communicated through art works", level: 3 },
  "91381": { label: "Apply business knowledge to address a complex problem(s)", level: 3 },
  "91934H": { label: "Health — Well-being", level: 1 },
  "91944S": { label: "Statistics — Data & Probability", level: 1 },
  "91928B": { label: "Biology — Life Processes", level: 1 },
  "91267": { label: "Apply probability methods in solving problems", level: 2 },
  "91584": { label: "Evaluate statistically based reports", level: 3 },
  "91585": { label: "Apply probability concepts in solving problems", level: 3 },
  "91586": { label: "Apply probability distributions in solving problems", level: 3 },
  "91924E": { label: "Economics — Market and consumer concepts", level: 1 },
  "91924A": { label: "Accounting — Financial statements and transactions", level: 1 },
  "91932": { label: "Geography — Natural environment", level: 1 },
  "91932B": { label: "Geography — Geographic skills", level: 1 },
  "91933": { label: "History — Historical perspectives", level: 1 },
  "91933B": { label: "History — Using historical sources", level: 1 },
};

export function getTopicsByStandard(standard: string): Topic[] {
  return TOPICS.filter((t) => t.standard === standard);
}

export function getTopicsByLevel(level: number): Topic[] {
  return TOPICS.filter((t) => t.level === level);
}

export function getTopicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}
