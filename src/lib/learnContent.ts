// ── Study guide content for each subject ──

export interface SubjectGuide {
  subject: string;
  label: string;
  description: string;
  icon: string; // emoji used on the hub page
  keyConcepts: { title: string; explanation: string; example?: string }[];
  commonMistakes: { mistake: string; fix: string }[];
  examTips: string[];
  formulas?: { name: string; formula: string; when: string }[];
}

export const subjectGuides: Record<string, SubjectGuide> = {
  mathematics: {
    subject: "mathematics",
    label: "Mathematics",
    description:
      "From algebra fundamentals through to calculus — the core skills you need for NCEA Maths at every level.",
    icon: "\u03C0", // pi symbol
    keyConcepts: [
      {
        title: "Algebra Basics",
        explanation:
          "Algebra is about using letters (variables) to represent unknown values and writing rules that describe patterns. The key operations are collecting like terms, expanding brackets, and factorising. Always remember: whatever you do to one side of an equation, you must do to the other.",
        example:
          "Simplify 3x + 2 - x + 5 → Collect like terms: (3x - x) + (2 + 5) = 2x + 7",
      },
      {
        title: "Linear Equations & Graphs",
        explanation:
          "A linear equation has the form y = mx + c, where m is the gradient (slope) and c is the y-intercept. To find the gradient between two points, use rise/run = (y₂ - y₁)/(x₂ - x₁). Parallel lines have the same gradient; perpendicular lines have gradients that multiply to -1.",
        example:
          "Find the equation of the line through (1, 3) and (4, 9): gradient = (9-3)/(4-1) = 2. Using y - y₁ = m(x - x₁): y - 3 = 2(x - 1) → y = 2x + 1",
      },
      {
        title: "Quadratics",
        explanation:
          "Quadratic expressions have the form ax² + bx + c. You can solve them by factorising, completing the square, or using the quadratic formula. The graph is a parabola — it opens upward if a > 0 and downward if a < 0. The vertex (turning point) is at x = -b/(2a).",
        example:
          "Solve x² - 5x + 6 = 0 → Factorise: (x - 2)(x - 3) = 0 → x = 2 or x = 3",
      },
      {
        title: "Trigonometry",
        explanation:
          "In right-angled triangles: sin θ = opposite/hypotenuse, cos θ = adjacent/hypotenuse, tan θ = opposite/adjacent. Remember SOH CAH TOA. For non-right-angled triangles, use the sine rule (a/sin A = b/sin B) or cosine rule (a² = b² + c² - 2bc cos A).",
        example:
          "In a right triangle with hypotenuse 10 cm and angle 30°: opposite = 10 × sin 30° = 10 × 0.5 = 5 cm",
      },
      {
        title: "Differentiation",
        explanation:
          "Differentiation finds the rate of change of a function — the gradient of the curve at any point. If f(x) = axⁿ, then f'(x) = naxⁿ⁻¹. Use it to find gradients of tangents, rates of change, and maximum/minimum values (where f'(x) = 0).",
        example:
          "Differentiate f(x) = 3x⁴ - 2x² + 7 → f'(x) = 12x³ - 4x. At x = 1: f'(1) = 12 - 4 = 8",
      },
      {
        title: "Integration",
        explanation:
          "Integration is the reverse of differentiation. It finds the area under a curve. If f(x) = axⁿ (where n ≠ -1), then ∫f(x)dx = axⁿ⁺¹/(n+1) + C. For definite integrals, evaluate at the upper limit minus the lower limit. Don't forget the +C for indefinite integrals.",
        example:
          "∫(4x³ + 2x)dx = x⁴ + x² + C. Definite: ∫₀² (4x³ + 2x)dx = [x⁴ + x²]₀² = (16 + 4) - 0 = 20",
      },
    ],
    commonMistakes: [
      {
        mistake: "Sign errors when expanding or simplifying",
        fix: "Write out each step. When multiplying a negative by a negative, the result is positive. Double-check every sign change, especially with subtraction of brackets: -(2x - 3) = -2x + 3, not -2x - 3.",
      },
      {
        mistake: "Forgetting to check the domain or restrictions",
        fix: "If the question involves fractions, square roots, or logs, state what values of x are not allowed. You can't divide by zero, take the square root of a negative, or log zero.",
      },
      {
        mistake: "Not showing working",
        fix: "NCEA markers award method marks even if your final answer is wrong. Write every step — it could be the difference between Not Achieved and Achieved.",
      },
      {
        mistake: "Mixing up sin, cos, and tan",
        fix: "Write SOH CAH TOA at the top of your page. Label the sides of the triangle (opposite, adjacent, hypotenuse) before choosing which ratio to use.",
      },
      {
        mistake: "Forgetting +C in indefinite integrals",
        fix: "Whenever you integrate without limits, add + C. It represents any constant that would vanish when differentiating. Markers specifically look for this.",
      },
    ],
    examTips: [
      "Read each question twice before starting. Underline key words like 'hence', 'show that', and 'find the exact value'.",
      "Show ALL working — even if you can do it in your head. Method marks are your safety net.",
      "Always check your units. If the question is in metres, your answer should be in metres (or m², m³ etc.).",
      "Draw a diagram whenever the question involves shapes, triangles, or graphs. A quick sketch can reveal the approach.",
      "If you're stuck, write down what you know and any formulas that seem relevant — you may pick up method marks.",
      "Leave hard questions and come back. Don't burn 15 minutes on one Excellence question when there are Achieved marks waiting.",
    ],
    formulas: [
      { name: "Quadratic Formula", formula: "x = (-b ± √(b² - 4ac)) / 2a", when: "Solving ax² + bx + c = 0 when factorising is hard" },
      { name: "Gradient", formula: "m = (y₂ - y₁) / (x₂ - x₁)", when: "Finding the slope between two points" },
      { name: "Distance", formula: "d = √((x₂-x₁)² + (y₂-y₁)²)", when: "Finding the distance between two points" },
      { name: "Midpoint", formula: "M = ((x₁+x₂)/2, (y₁+y₂)/2)", when: "Finding the middle of a line segment" },
      { name: "Circle Area", formula: "A = πr²", when: "Area of a circle with radius r" },
      { name: "Circle Circumference", formula: "C = 2πr", when: "Perimeter of a circle" },
      { name: "Cylinder Volume", formula: "V = πr²h", when: "Volume of a cylinder" },
      { name: "Cone Volume", formula: "V = ⅓πr²h", when: "Volume of a cone" },
      { name: "Sphere Volume", formula: "V = ⁴⁄₃πr³", when: "Volume of a sphere" },
      { name: "Differentiation Rule", formula: "If f(x) = axⁿ, then f'(x) = naxⁿ⁻¹", when: "Finding derivatives" },
      { name: "Integration Rule", formula: "∫axⁿ dx = axⁿ⁺¹/(n+1) + C", when: "Finding antiderivatives (n ≠ -1)" },
      { name: "Sine Rule", formula: "a/sin A = b/sin B = c/sin C", when: "Non-right triangles when you know an angle and its opposite side" },
      { name: "Cosine Rule", formula: "a² = b² + c² - 2bc cos A", when: "Non-right triangles when you know two sides and the included angle" },
      { name: "Trig Ratios", formula: "sin θ = O/H, cos θ = A/H, tan θ = O/A", when: "Right-angled triangles (SOH CAH TOA)" },
    ],
  },

  english: {
    subject: "english",
    label: "English",
    description:
      "Master language features, essay structure, and critical analysis skills for NCEA English at all levels.",
    icon: "A",
    keyConcepts: [
      {
        title: "Language Features",
        explanation:
          "Language features are the deliberate choices writers make. Key ones to know: simile (comparing using 'like' or 'as'), metaphor (saying something IS something else), personification (giving human qualities to non-human things), alliteration (repeated consonant sounds), hyperbole (deliberate exaggeration), imagery (vivid descriptions appealing to the senses), and symbolism (an object representing something deeper).",
        example:
          "'The road was a ribbon of moonlight' — this metaphor compares the road to a ribbon, suggesting it's narrow, winding, and lit with a silvery glow. The effect is to create a romantic, almost dreamlike atmosphere.",
      },
      {
        title: "Essay Structure — SEXY / PEEL Paragraphs",
        explanation:
          "Every body paragraph should follow a clear structure. PEEL: Point (your argument), Evidence (a quote or example), Explain (how the evidence supports your point), Link (connect back to the question). SEXY: Statement, Example, eXplain, link to whY it matters. Both achieve the same thing — they stop you from retelling the story and keep you analysing.",
        example:
          "Point: Shakespeare uses light imagery to highlight Juliet's purity. Evidence: Romeo says 'Juliet is the sun'. Explain: By comparing Juliet to the sun, Shakespeare suggests she is the centre of Romeo's world and brings warmth and life to his existence. Link: This reinforces the theme of idealised love.",
      },
      {
        title: "Audience and Purpose",
        explanation:
          "Every text is written for someone (audience) and for a reason (purpose). Purposes include: to persuade, to inform, to entertain, to challenge, to describe. Understanding the audience shapes the language choices — a speech to parliament uses formal register, while a blog for teens is conversational. Always identify both in your analysis.",
      },
      {
        title: "Unfamiliar Text Strategies",
        explanation:
          "In the Unfamiliar Text exam, you'll analyse texts you've never seen before. Read the text through once for meaning, then again looking for language features. For each feature: NAME it, QUOTE it, and explain the EFFECT on the reader. Focus on what the writer is trying to make you think or feel.",
        example:
          "When asked 'How does the writer create tension?', identify specific techniques: short sentences ('He stopped.'), rhetorical questions, dark imagery, foreshadowing. Quote each one and explain how it builds suspense for the reader.",
      },
      {
        title: "Text Types and Conventions",
        explanation:
          "Different text types have different conventions. Speeches use rhetorical questions, repetition, and direct address ('you'). Formal essays need a thesis, topic sentences, and academic register. Creative writing uses narrative techniques like dialogue, showing not telling, and varied sentence length. Know the conventions for whatever you're writing.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Retelling the story instead of analysing it",
        fix: "After every quote, ask yourself 'So what?' and 'How does this technique affect the reader?'. Analysis means explaining WHY the writer made that choice and WHAT effect it creates — not just describing what happens.",
      },
      {
        mistake: "Not using quotes or textual evidence",
        fix: "Every point needs proof. Use short, embedded quotes (3-5 words woven into your sentence), not long block quotes. Integrate them naturally: The poet uses sibilance in 'softly, silently, secretly' to create a whispering tone.",
      },
      {
        mistake: "No clear thesis statement",
        fix: "Your introduction needs a thesis — one sentence that answers the question directly and previews your argument. Write it before anything else. E.g., 'Through imagery and symbolism, Ihimaera explores how cultural identity shapes belonging.'",
      },
      {
        mistake: "Forgetting to link back to the question",
        fix: "End each paragraph by explicitly connecting your point back to the essay question. Use the key words from the question in your linking sentence.",
      },
      {
        mistake: "Writing 'the author uses this to engage the reader' as analysis",
        fix: "This is vague. Be specific about HOW it engages. Does it create sympathy? Build tension? Challenge assumptions? Evoke nostalgia? Name the specific emotional or intellectual response.",
      },
    ],
    examTips: [
      "Spend 5 minutes planning before you write. A quick essay plan (thesis + 3 key points) saves time and keeps you focused.",
      "Use the bullet points in the question as your paragraph guide — they tell you exactly what to cover.",
      "Quote short phrases (3-5 words), not entire sentences. Embed them in your own sentences for a smoother read.",
      "For Unfamiliar Text: read the questions FIRST, then read the text. You'll know what to look for.",
      "In creative writing, show don't tell. Instead of 'She was sad', write 'Her fingers traced the edge of the photograph, lingering on the faded smile.'",
      "Leave 5 minutes at the end to proofread. Fix spelling, check your quotes are accurate, and make sure every paragraph links to the question.",
    ],
  },

  science: {
    subject: "science",
    label: "Science",
    description:
      "Core science concepts for Year 10-11 — the building blocks for Biology, Chemistry, and Physics at senior level.",
    icon: "\u{1F52C}", // microscope
    keyConcepts: [
      {
        title: "The Scientific Method",
        explanation:
          "Science follows a process: observation → question → hypothesis → experiment → results → conclusion. Your hypothesis must be testable and specific. Variables: the independent variable is what you change, the dependent variable is what you measure, and controlled variables are everything you keep the same. A fair test changes only ONE variable at a time.",
        example:
          "Hypothesis: 'If I increase the temperature of water, then sugar will dissolve faster.' Independent variable: temperature. Dependent variable: time to dissolve. Controlled: amount of water, amount of sugar, stirring method.",
      },
      {
        title: "Cells — The Basics",
        explanation:
          "All living things are made of cells. Animal cells have a cell membrane, cytoplasm, nucleus, and mitochondria. Plant cells also have a cell wall, chloroplasts (for photosynthesis), and a large vacuole. The nucleus contains DNA and controls the cell. Mitochondria are the 'powerhouses' — they release energy through respiration.",
      },
      {
        title: "Genetics Basics",
        explanation:
          "DNA carries genetic information in genes. Genes come in pairs — one from each parent. Alleles are different versions of a gene. A dominant allele (capital letter) shows its trait even when paired with a recessive allele (lowercase). You need two copies of a recessive allele for it to show. Use Punnett squares to predict offspring ratios.",
        example:
          "If both parents are Bb (brown eyes dominant, blue eyes recessive): Punnett square gives BB, Bb, Bb, bb → 3 brown-eyed : 1 blue-eyed offspring (75% brown, 25% blue).",
      },
      {
        title: "Chemical Reactions",
        explanation:
          "In a chemical reaction, atoms rearrange to form new substances. Reactants go in, products come out. Signs of a chemical reaction: colour change, gas produced, temperature change, precipitate forms. Equations must be balanced — the same number of each atom on both sides. This follows the Law of Conservation of Mass.",
        example:
          "Unbalanced: Na + Cl₂ → NaCl. Balanced: 2Na + Cl₂ → 2NaCl (2 sodium atoms and 2 chlorine atoms on each side).",
      },
      {
        title: "Forces and Motion",
        explanation:
          "A force is a push or pull measured in Newtons (N). Balanced forces = no change in motion. Unbalanced forces = acceleration. Newton's Laws: (1) An object stays still or moves at constant speed unless a force acts on it. (2) F = ma — force equals mass times acceleration. (3) Every action has an equal and opposite reaction.",
      },
      {
        title: "Energy",
        explanation:
          "Energy cannot be created or destroyed — only transferred or transformed (Law of Conservation of Energy). Types: kinetic (movement), potential (stored — gravitational, elastic, chemical), thermal (heat), electrical, light, sound. Energy transfers always involve some 'waste' energy, usually heat. Efficiency = useful energy out / total energy in × 100%.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Not using correct units in calculations",
        fix: "Always include units in your answer. Speed is m/s, force is N (Newtons), mass is kg, distance is m. If the question gives you cm, convert to m before using formulas.",
      },
      {
        mistake: "Confusing mass and weight",
        fix: "Mass (kg) is the amount of matter in an object — it doesn't change. Weight (N) is the force of gravity on an object — it changes depending on where you are. Weight = mass × gravitational field strength (10 N/kg on Earth).",
      },
      {
        mistake: "Not balancing chemical equations",
        fix: "Count atoms on both sides. Adjust coefficients (the big numbers in front) — never change the small subscript numbers. Check each element one at a time. Save oxygen and hydrogen for last.",
      },
      {
        mistake: "Writing vague conclusions",
        fix: "A good conclusion restates the hypothesis, summarises the key result with data, and explains whether the hypothesis was supported. Use actual numbers: 'The average time decreased from 45s to 22s, supporting the hypothesis.'",
      },
      {
        mistake: "Confusing independent and dependent variables",
        fix: "The independent variable is what YOU choose to change. The dependent variable is what you MEASURE. Think: 'I changed ___ and measured ___.'",
      },
    ],
    examTips: [
      "Read data carefully — look at axis labels, units, and scales on graphs before answering.",
      "For 'describe' questions, say WHAT happens. For 'explain' questions, say WHY it happens.",
      "Draw and label diagrams — they can earn marks and help you think through the answer.",
      "If a calculation goes wrong, still write your method. You can get marks for correct working even with a wrong final answer.",
      "When describing trends in data, use specific values: 'As temperature increased from 20°C to 60°C, the rate doubled from 5 to 10 bubbles per minute.'",
    ],
    formulas: [
      { name: "Speed", formula: "speed = distance / time", when: "Calculating how fast something moves" },
      { name: "Force", formula: "F = m × a", when: "Finding force from mass and acceleration" },
      { name: "Weight", formula: "W = m × g", when: "Finding weight (g = 10 N/kg on Earth)" },
      { name: "Density", formula: "density = mass / volume", when: "Finding how compact a material is" },
      { name: "Efficiency", formula: "efficiency = (useful energy out / total energy in) × 100%", when: "Measuring how much energy is wasted" },
      { name: "Pressure", formula: "P = F / A", when: "Force spread over an area" },
    ],
  },

  biology: {
    subject: "biology",
    label: "Biology",
    description:
      "Cell biology, genetics, evolution, and ecology — everything you need for NCEA Level 2 and 3 Biology.",
    icon: "\u{1F9EC}", // DNA
    keyConcepts: [
      {
        title: "Cell Division — Mitosis",
        explanation:
          "Mitosis produces two genetically identical daughter cells. It's used for growth, repair, and asexual reproduction. Stages: Prophase (chromosomes condense, spindle forms), Metaphase (chromosomes line up in the middle), Anaphase (sister chromatids pull apart), Telophase (nuclear membranes reform), then Cytokinesis (cell splits in two). The key point: the daughter cells have the SAME number of chromosomes as the parent.",
      },
      {
        title: "Cell Division — Meiosis",
        explanation:
          "Meiosis produces four genetically different cells with HALF the chromosome number (haploid). It happens in two stages: Meiosis I separates homologous pairs, Meiosis II separates sister chromatids. Crossing over (in Prophase I) and independent assortment (in Metaphase I) create genetic variation. This is why siblings aren't identical.",
        example:
          "Humans: body cells have 46 chromosomes (diploid). After meiosis, gametes (egg/sperm) have 23 chromosomes (haploid). At fertilisation: 23 + 23 = 46 again.",
      },
      {
        title: "Genetics — Punnett Squares & Inheritance",
        explanation:
          "Use Punnett squares to predict offspring ratios. Monohybrid crosses involve one gene. For a heterozygous cross (Aa × Aa), you get a 3:1 phenotypic ratio. Codominance means both alleles show (e.g., roan cattle). Sex-linked traits are carried on the X chromosome — males (XY) only need one copy of a recessive allele to show the trait.",
        example:
          "Colour blindness is X-linked recessive. If a carrier mother (X^C X^c) and a normal father (X^C Y) have children: daughters are 50% carrier, 50% normal. Sons are 50% colour blind, 50% normal.",
      },
      {
        title: "Evolution — Natural Selection",
        explanation:
          "Natural selection is the mechanism of evolution. Steps: (1) Variation exists in a population due to mutations and sexual reproduction. (2) Individuals compete for limited resources. (3) Those with advantageous traits survive and reproduce more (survival of the fittest). (4) These traits are passed to offspring, becoming more common over time. Evolution is a change in allele frequency in a population over generations.",
      },
      {
        title: "Ecology — Food Webs & Ecosystems",
        explanation:
          "An ecosystem includes all living (biotic) and non-living (abiotic) things in an area. Energy flows through food chains: producers → primary consumers → secondary consumers → tertiary consumers. Only about 10% of energy passes between trophic levels (the rest is lost as heat through respiration). If one species is removed, it affects the whole web — populations of prey increase and predators decrease.",
        example:
          "In a NZ bush ecosystem: rata tree (producer) → kereru (primary consumer) → stoat (secondary consumer). Remove the stoat → kereru numbers increase → more pressure on rata berries.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing mitosis and meiosis",
        fix: "Mitosis = 2 identical cells (for growth). Meiosis = 4 different cells (for gametes/sex cells). Mitosis keeps chromosome number the same; meiosis halves it. Write these differences at the top of your page.",
      },
      {
        mistake: "Getting genetic ratios wrong",
        fix: "Always draw the full Punnett square — don't try to skip it. Write the parents' alleles along the top and side, fill in every box, then count the outcomes. Double-check by making sure the ratios add up to 4.",
      },
      {
        mistake: "Not explaining the mechanism of natural selection",
        fix: "Don't just say 'they adapted'. Explain the full process: variation → selection pressure → differential survival → reproduction → allele frequency change. Markers want to see you understand it's not a choice or a response by the organism.",
      },
      {
        mistake: "Forgetting to describe both directions in ecology impacts",
        fix: "If asked about removing a species, discuss effects going UP the food chain (predators lose food) AND down (prey populations increase). Also mention indirect effects — not just the species directly connected.",
      },
      {
        mistake: "Confusing genotype and phenotype",
        fix: "Genotype = the alleles an organism has (e.g., Bb). Phenotype = what it looks like (e.g., brown eyes). A heterozygous individual (Bb) shows the dominant phenotype but carries the recessive allele.",
      },
    ],
    examTips: [
      "Use biological terminology precisely — 'allele' not 'gene version', 'homologous pairs' not 'matching chromosomes'.",
      "When explaining processes (like natural selection or meiosis), describe them step by step in order.",
      "For Excellence, link biological concepts to real-world examples or discuss implications (e.g., antibiotic resistance as evolution in action).",
      "In genetics questions, always define your allele symbols before drawing the Punnett square (e.g., 'Let B = brown, b = blue').",
      "For ecology questions, think about both immediate and long-term effects on the ecosystem.",
    ],
  },

  chemistry: {
    subject: "chemistry",
    label: "Chemistry",
    description:
      "Atomic structure, bonding, reactions, and calculations — core chemistry for NCEA Level 2 and 3.",
    icon: "\u{2697}", // alembic
    keyConcepts: [
      {
        title: "Atomic Structure",
        explanation:
          "Atoms have a nucleus (protons + neutrons) surrounded by electrons in energy levels (shells). Atomic number = number of protons (defines the element). Mass number = protons + neutrons. Isotopes are atoms of the same element with different numbers of neutrons. Electron configuration determines chemical behaviour — atoms want full outer shells.",
        example:
          "Sodium (Na): atomic number 11 → 11 protons, 11 electrons. Electron configuration: 2, 8, 1. It has one electron in its outer shell, so it easily loses it to form Na⁺.",
      },
      {
        title: "Bonding — Ionic and Covalent",
        explanation:
          "Ionic bonding: a metal transfers electrons to a non-metal. The metal becomes a positive ion (cation), the non-metal becomes a negative ion (anion). They're held together by electrostatic attraction. Covalent bonding: two non-metals SHARE electron pairs. Each shared pair is one bond. Ionic compounds form crystals, have high melting points, and conduct electricity when dissolved. Covalent compounds have lower melting points and generally don't conduct.",
        example:
          "NaCl (ionic): Na loses 1 electron → Na⁺, Cl gains 1 electron → Cl⁻. Water H₂O (covalent): oxygen shares one pair of electrons with each hydrogen atom.",
      },
      {
        title: "Chemical Reactions & Balancing",
        explanation:
          "In a chemical reaction, bonds break and new bonds form. Reactants become products. Equations must be balanced (same number of each atom on both sides). Types of reactions: synthesis (A + B → AB), decomposition (AB → A + B), combustion (fuel + O₂ → CO₂ + H₂O), acid-base (acid + base → salt + water), redox (electron transfer).",
        example:
          "Combustion of methane: CH₄ + 2O₂ → CO₂ + 2H₂O. Check: 1C, 4H, 4O on each side — balanced.",
      },
      {
        title: "Acids and Bases",
        explanation:
          "Acids donate H⁺ ions in solution (pH < 7). Bases accept H⁺ ions (pH > 7). Strong acids (HCl, H₂SO₄, HNO₃) fully dissociate — all molecules split into ions. Weak acids (CH₃COOH) only partially dissociate. Neutralisation: acid + base → salt + water. pH = -log₁₀[H⁺]. Each pH unit is a 10× difference in H⁺ concentration.",
        example:
          "HCl + NaOH → NaCl + H₂O. If [H⁺] = 0.001 mol/L, pH = -log(0.001) = 3.",
      },
      {
        title: "Organic Chemistry Basics",
        explanation:
          "Organic chemistry is the study of carbon compounds. Alkanes (C-C single bonds, saturated), alkenes (C=C double bonds, unsaturated), alcohols (-OH group), carboxylic acids (-COOH group). Naming: count the carbons (meth=1, eth=2, prop=3, but=4, pent=5), add the suffix (-ane, -ene, -ol, -oic acid). Alkenes are more reactive than alkanes because the double bond can break and form new bonds.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Not balancing equations",
        fix: "Balance one element at a time. Save oxygen and hydrogen for last (they appear in many compounds). Never change subscripts — only add coefficients in front of formulas.",
      },
      {
        mistake: "Getting charges wrong on ions",
        fix: "Group 1 metals form +1 ions, Group 2 form +2. Group 17 non-metals form -1 ions, Group 16 form -2. The charges come from gaining or losing electrons to get a full outer shell. Write them out before constructing formulas.",
      },
      {
        mistake: "Confusing strong acids with concentrated acids",
        fix: "Strong/weak = how much the acid dissociates (splits into ions). Concentrated/dilute = how much acid is in the solution. You can have a dilute strong acid or a concentrated weak acid — they're independent concepts.",
      },
      {
        mistake: "Wrong mole calculations",
        fix: "Write out the formula first, then substitute. For moles: n = m/M (mass ÷ molar mass). For concentration: c = n/V (moles ÷ volume in LITRES). Always convert mL to L first (÷ 1000).",
      },
      {
        mistake: "Confusing ionic and covalent bonding",
        fix: "Metal + non-metal = ionic (electrons transferred). Non-metal + non-metal = covalent (electrons shared). If in doubt, check the periodic table — is it a metal or non-metal?",
      },
    ],
    examTips: [
      "For calculations, always write the formula, show your substitution, then give the answer with units.",
      "When describing bonding, name the type AND explain the mechanism (what happens to the electrons).",
      "Use correct chemical terminology: 'dissociate' not 'break apart', 'electrostatic attraction' not 'they stick together'.",
      "For organic chemistry, draw structural formulas rather than just writing molecular formulas — it shows your understanding.",
      "Double-check that your ionic formulas are neutral. The total positive charge must equal the total negative charge.",
    ],
    formulas: [
      { name: "Moles (from mass)", formula: "n = m / M", when: "Converting mass (g) to moles using molar mass (g/mol)" },
      { name: "Concentration", formula: "c = n / V", when: "Finding concentration (mol/L) from moles and volume (in litres)" },
      { name: "pH", formula: "pH = -log₁₀[H⁺]", when: "Calculating pH from hydrogen ion concentration" },
      { name: "Dilution", formula: "c₁V₁ = c₂V₂", when: "Calculating concentration or volume after dilution" },
      { name: "Ideal Gas", formula: "PV = nRT", when: "Relating pressure, volume, moles, and temperature of a gas" },
      { name: "Moles (from volume of gas)", formula: "n = V / 24.8 (at room temp)", when: "Converting volume of gas (L) to moles at standard conditions" },
    ],
  },

  physics: {
    subject: "physics",
    label: "Physics",
    description:
      "Mechanics, waves, electricity, and beyond — the key physics concepts and formulas for NCEA Level 2 and 3.",
    icon: "\u{26A1}", // lightning
    keyConcepts: [
      {
        title: "Mechanics — Motion (Kinematics)",
        explanation:
          "Kinematics describes motion using five key quantities: displacement (s), initial velocity (u), final velocity (v), acceleration (a), and time (t). The SUVAT equations connect these. Velocity is speed with direction. Acceleration is the rate of change of velocity. On a distance-time graph, the gradient = velocity. On a velocity-time graph, the gradient = acceleration and the area under the curve = displacement.",
        example:
          "A car starts at rest (u = 0) and accelerates at 2 m/s² for 5 seconds. Final velocity: v = u + at = 0 + 2×5 = 10 m/s. Distance: s = ut + ½at² = 0 + ½×2×25 = 25 m.",
      },
      {
        title: "Forces and Newton's Laws",
        explanation:
          "Newton's 1st Law: objects stay at rest or constant velocity unless a net force acts. 2nd Law: F = ma — net force equals mass times acceleration. 3rd Law: every force has an equal and opposite reaction force (on a DIFFERENT object). Weight = mg. Friction opposes motion. Draw free-body diagrams to find the net force before using F = ma.",
      },
      {
        title: "Energy",
        explanation:
          "Kinetic energy: KE = ½mv². Gravitational potential energy: PE = mgh. Conservation of energy: total energy stays constant (KE gained = PE lost for falling objects). Work = Force × distance (W = Fd). Power = Work/time (P = W/t) or P = Fv. Energy is measured in Joules (J), power in Watts (W).",
        example:
          "A 2 kg ball is dropped from 10 m. PE at top = mgh = 2×10×10 = 200 J. Just before hitting the ground: KE = 200 J. Speed: v = √(2KE/m) = √(400/2) = √200 ≈ 14.1 m/s.",
      },
      {
        title: "Waves",
        explanation:
          "Waves transfer energy without transferring matter. Transverse waves (light, water) vibrate perpendicular to the direction of travel. Longitudinal waves (sound) vibrate parallel. Key terms: wavelength (λ), frequency (f), period (T = 1/f), amplitude. Wave speed: v = fλ. Reflection (angle of incidence = angle of reflection), refraction (wave changes speed and bends at a boundary), diffraction (wave spreads through a gap).",
      },
      {
        title: "Electricity",
        explanation:
          "Current (I) is the flow of charge, measured in Amps. Voltage (V) is the energy per unit charge, in Volts. Resistance (R) opposes current flow, in Ohms. Ohm's Law: V = IR. In series circuits: same current everywhere, voltages add up, resistances add up. In parallel circuits: same voltage across branches, currents add up, 1/R_total = 1/R₁ + 1/R₂. Power: P = IV = I²R = V²/R.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting that force and velocity are vectors (direction matters)",
        fix: "Always define a positive direction first (e.g., 'right is positive'). Forces and velocities in the opposite direction are negative. This is critical for problems involving objects slowing down or changing direction.",
      },
      {
        mistake: "Using wrong units",
        fix: "ALWAYS convert to SI units before calculating: mass in kg (not g), distance in m (not cm or km), time in s (not minutes). If the question gives you km/h, convert to m/s by dividing by 3.6.",
      },
      {
        mistake: "Not converting to SI units first",
        fix: "Common conversions: 1 km = 1000 m, 1 kg = 1000 g, 1 hour = 3600 s, 1 kW = 1000 W. Do the conversion as your first step, before putting numbers into any formula.",
      },
      {
        mistake: "Confusing mass and weight in F=ma problems",
        fix: "Mass (kg) goes into F=ma. Weight (N) is a force = mg. If the question says 'a 50 kg person', their mass is 50 kg and their weight is 50 × 10 = 500 N. Don't mix these up.",
      },
      {
        mistake: "Adding resistances wrong in parallel circuits",
        fix: "In series: R_total = R₁ + R₂ (just add). In parallel: 1/R_total = 1/R₁ + 1/R₂ (use reciprocals). The total resistance in parallel is LESS than the smallest individual resistance.",
      },
    ],
    examTips: [
      "Write the formula, substitute the numbers, then calculate. Markers award marks at each step.",
      "Draw free-body diagrams for every force problem. Label all forces with arrows showing direction and magnitude.",
      "Check your answer makes sense — if you calculate a car's speed as 5000 m/s, something went wrong.",
      "For graph questions: read the axes carefully, use the gradient (rise/run) and area under the graph as your tools.",
      "When in doubt about direction, define your positive direction and stick with it throughout the problem.",
      "Always give your final answer to an appropriate number of significant figures (usually 2-3).",
    ],
    formulas: [
      { name: "SUVAT: v = u + at", formula: "v = u + at", when: "Finding final velocity from initial velocity, acceleration, and time" },
      { name: "SUVAT: s = ut + ½at²", formula: "s = ut + ½at²", when: "Finding displacement when you know u, a, and t" },
      { name: "SUVAT: v² = u² + 2as", formula: "v² = u² + 2as", when: "Finding final velocity when you don't know time" },
      { name: "Newton's 2nd Law", formula: "F = ma", when: "Relating net force, mass, and acceleration" },
      { name: "Weight", formula: "W = mg", when: "Finding gravitational force (g = 9.8 or 10 m/s²)" },
      { name: "Kinetic Energy", formula: "KE = ½mv²", when: "Energy of a moving object" },
      { name: "Potential Energy", formula: "PE = mgh", when: "Gravitational energy based on height" },
      { name: "Work", formula: "W = Fd", when: "Energy transferred by a force over a distance" },
      { name: "Power", formula: "P = W/t  or  P = Fv  or  P = IV", when: "Rate of energy transfer" },
      { name: "Ohm's Law", formula: "V = IR", when: "Relating voltage, current, and resistance" },
      { name: "Wave Speed", formula: "v = fλ", when: "Relating wave speed, frequency, and wavelength" },
      { name: "Period", formula: "T = 1/f", when: "Time for one complete wave cycle" },
    ],
  },

  statistics: {
    subject: "statistics",
    label: "Statistics",
    description:
      "Probability, distributions, inference, and data analysis for NCEA Level 2 and 3 Statistics.",
    icon: "\u{1F4CA}", // bar chart
    keyConcepts: [
      {
        title: "Probability",
        explanation:
          "Probability measures how likely an event is, from 0 (impossible) to 1 (certain). P(A) = number of favourable outcomes / total outcomes. For combined events: P(A and B) = P(A) × P(B) if independent. P(A or B) = P(A) + P(B) - P(A and B). Use tree diagrams for multi-step problems — multiply along branches, add between branches.",
        example:
          "Rolling a die twice. P(6 then 6) = 1/6 × 1/6 = 1/36. P(at least one 6) = 1 - P(no sixes) = 1 - (5/6 × 5/6) = 1 - 25/36 = 11/36.",
      },
      {
        title: "Normal Distribution",
        explanation:
          "Many real-world measurements follow a bell-shaped (normal) distribution. It's defined by the mean (μ) and standard deviation (σ). About 68% of data falls within 1σ of the mean, 95% within 2σ, and 99.7% within 3σ. To compare values from different distributions, convert to z-scores: z = (x - μ) / σ. Use z-tables or your calculator to find probabilities.",
        example:
          "Heights of NZ Year 13 students: μ = 172 cm, σ = 8 cm. What proportion are taller than 180 cm? z = (180-172)/8 = 1.0. From the table, P(Z > 1) ≈ 0.159 → about 16%.",
      },
      {
        title: "Sampling and Inference",
        explanation:
          "We use samples to make claims about populations. A good sample is random and representative. The sample mean estimates the population mean. Confidence intervals give a range: we're 95% confident the true population mean lies in this interval. Larger samples give narrower confidence intervals (more precision). Bootstrapping resamples your data to estimate the sampling distribution.",
      },
      {
        title: "Time Series",
        explanation:
          "A time series shows data measured over time. Look for: trend (long-term increase/decrease), seasonal variation (repeating pattern within each year), and residuals (random variation). To identify trend, use a moving average to smooth out seasonal effects. Seasonal effects are calculated by comparing actual values to the smoothed trend.",
        example:
          "Ice cream sales: high in summer (Dec-Feb in NZ), low in winter. The trend might be upward (sales increasing year on year) while the seasonal pattern repeats each year.",
      },
      {
        title: "Statistical Inference — Comparing Groups",
        explanation:
          "When comparing two groups, look at: centre (median/mean), spread (IQR/standard deviation), shape (symmetric/skewed), and unusual values (outliers). For inference: if the confidence intervals for two group means don't overlap, there's evidence of a real difference. Always refer back to the context — don't just talk about numbers, talk about what they mean.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing population and sample",
        fix: "The population is the entire group you're interested in. The sample is the subset you actually measure. Statistics describe the sample; parameters describe the population. Be precise: 'the sample mean was 65' not 'the average was 65'.",
      },
      {
        mistake: "Wrong probability tree branches",
        fix: "On a tree diagram, branches from the same point must add to 1. If P(rain) = 0.3, then P(no rain) = 0.7 on the same branch. Multiply along branches for 'AND', add between final outcomes for 'OR'.",
      },
      {
        mistake: "Not stating assumptions",
        fix: "For inference, state your assumptions: the sample is random, the data is approximately normal (for z/t tests), and the sample is large enough. Markers specifically check for this.",
      },
      {
        mistake: "Describing data without context",
        fix: "Don't write 'the median is 45'. Write 'the median height of the Year 12 students in the sample was 45 cm'. Always include units and describe what the data represents.",
      },
      {
        mistake: "Treating correlation as causation",
        fix: "Just because two variables move together doesn't mean one causes the other. There could be a confounding variable or coincidence. Say 'there is an association' or 'the data suggests a relationship', not 'X causes Y'.",
      },
    ],
    examTips: [
      "For inference questions, always write a conclusion in context: 'There is evidence that Year 13 students at School A are taller on average than those at School B.'",
      "When drawing probability trees, be systematic. Label every branch with the event AND its probability.",
      "For normal distribution problems, always sketch the curve and shade the area you're finding.",
      "In time series analysis, describe all three components: trend, seasonal pattern, and residuals.",
      "Use correct statistical language: 'proportion' not 'percentage', 'distribution' not 'spread of data', 'evidence suggests' not 'proves'.",
    ],
    formulas: [
      { name: "z-score", formula: "z = (x - μ) / σ", when: "Standardising a value from a normal distribution" },
      { name: "Sample Mean CI", formula: "x̄ ± z* × (σ / √n)", when: "Confidence interval for a population mean" },
      { name: "Probability (OR)", formula: "P(A or B) = P(A) + P(B) - P(A and B)", when: "Probability of either event occurring" },
      { name: "Probability (AND, independent)", formula: "P(A and B) = P(A) × P(B)", when: "Probability of both events if independent" },
      { name: "Conditional Probability", formula: "P(A|B) = P(A and B) / P(B)", when: "Probability of A given B has occurred" },
      { name: "Expected Value", formula: "E(X) = Σ x·P(x)", when: "Average outcome over many trials" },
    ],
  },

  economics: {
    subject: "economics",
    label: "Economics",
    description:
      "Supply and demand, market equilibrium, government policy, and macroeconomic indicators for NCEA Economics.",
    icon: "\u{1F4B0}", // money bag
    keyConcepts: [
      {
        title: "Supply and Demand",
        explanation:
          "Demand: as price increases, quantity demanded decreases (Law of Demand). The demand curve slopes downward. Supply: as price increases, quantity supplied increases (Law of Supply). The supply curve slopes upward. Shifts vs movements: a change in price causes a movement ALONG the curve. A change in other factors (income, preferences, costs) shifts the WHOLE curve.",
        example:
          "If the price of petrol rises, the quantity demanded of petrol falls (movement along demand curve). But if people's incomes increase, demand for restaurant meals shifts right (more demanded at every price).",
      },
      {
        title: "Market Equilibrium",
        explanation:
          "Equilibrium is where supply meets demand — the price where quantity supplied equals quantity demanded. If price is above equilibrium, there's a surplus (excess supply) and price falls. If price is below equilibrium, there's a shortage (excess demand) and price rises. The market naturally moves toward equilibrium.",
      },
      {
        title: "Elasticity",
        explanation:
          "Price elasticity of demand measures how responsive demand is to a price change. Elastic (>1): quantity changes more than price — luxury goods, goods with substitutes. Inelastic (<1): quantity changes less than price — necessities, addictive goods, goods with no close substitutes. PED = % change in quantity demanded / % change in price.",
        example:
          "If the price of milk rises 10% and quantity demanded falls 3%, PED = 3/10 = 0.3 (inelastic). Milk is a necessity in NZ with few substitutes, so demand doesn't change much with price.",
      },
      {
        title: "Government Intervention",
        explanation:
          "Governments intervene when markets fail. Price floors (minimum prices, e.g., minimum wage) set a legal minimum above equilibrium — can cause surpluses (unemployment). Price ceilings (maximum prices, e.g., rent controls) set a legal maximum below equilibrium — can cause shortages. Taxes shift supply left, raising prices. Subsidies shift supply right, lowering prices. Each intervention has intended and unintended consequences.",
      },
      {
        title: "Macroeconomic Indicators",
        explanation:
          "GDP: total value of goods and services produced in a country — measures economic growth. CPI: Consumer Price Index — measures inflation (rising general price level). Unemployment rate: percentage of the labour force without a job. In NZ, the Reserve Bank of NZ (RBNZ) uses the Official Cash Rate (OCR) to influence inflation and economic activity. Raising the OCR increases interest rates, which slows spending and reduces inflation.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing a shift of the curve with a movement along the curve",
        fix: "Price changes cause movements ALONG the curve. Non-price factors (income, tastes, input costs, technology) cause SHIFTS of the whole curve. If the exam says 'price of X rises', it's a movement. If it says 'incomes rise', it's a shift.",
      },
      {
        mistake: "Not using economic terminology",
        fix: "Say 'quantity demanded' not 'amount people want'. Say 'equilibrium price' not 'the right price'. Say 'opportunity cost' not 'what you give up'. Using correct terms shows you understand the concepts and earns terminology marks.",
      },
      {
        mistake: "Weak or unlabelled diagrams",
        fix: "Every supply/demand diagram needs: correctly labelled axes (Price on Y, Quantity on X), labelled curves (S₁, S₂, D₁, D₂), marked equilibrium points, and arrows showing the direction of change. A good diagram can earn you 2-3 marks.",
      },
      {
        mistake: "Not discussing both sides of an intervention",
        fix: "Government policies always have trade-offs. A minimum wage helps low-paid workers but may increase unemployment. A subsidy reduces prices but costs taxpayer money. Always discuss intended benefits AND potential drawbacks.",
      },
      {
        mistake: "Confusing inflation with price increase",
        fix: "Inflation is a sustained increase in the GENERAL price level. One product getting more expensive is just a price increase. Inflation means most prices across the economy are rising. Don't use the terms interchangeably.",
      },
    ],
    examTips: [
      "Always draw a diagram when explaining market changes — even if the question doesn't explicitly ask for one.",
      "Use the chain of reasoning approach: event → which curve shifts → direction → new equilibrium → effect on price and quantity.",
      "Reference NZ examples where possible: the RBNZ, NZ minimum wage, GST, NZ export markets.",
      "For Excellence, evaluate — don't just describe. Discuss which effect is likely to be LARGER and why, or whether a policy achieves its goal.",
      "Define key terms before using them in your answer — this shows precision and picks up easy marks.",
    ],
  },

  accounting: {
    subject: "accounting",
    label: "Accounting",
    description:
      "The accounting equation, financial statements, GST, and double entry — core skills for NCEA Accounting.",
    icon: "\u{1F4D2}", // ledger
    keyConcepts: [
      {
        title: "The Accounting Equation",
        explanation:
          "Assets = Liabilities + Owner's Equity. This equation MUST always balance. Assets are what the business owns (cash, accounts receivable, equipment). Liabilities are what it owes (accounts payable, bank loan). Owner's equity is the owner's investment plus retained profits. Every transaction affects at least two elements of this equation.",
        example:
          "A business takes out a $10,000 bank loan. Assets (cash) increase by $10,000 and Liabilities (bank loan) increase by $10,000. The equation still balances.",
      },
      {
        title: "Financial Statements",
        explanation:
          "The Income Statement shows revenue minus expenses to get profit over a period. The Statement of Financial Position (Balance Sheet) shows assets, liabilities, and equity at a point in time. Revenue is earned when a sale is made (not when cash is received). Expenses are incurred when a cost is used up (not when cash is paid). This is called accrual accounting.",
      },
      {
        title: "GST (Goods and Services Tax)",
        explanation:
          "In NZ, GST is 15%. GST-registered businesses charge GST on sales (output tax) and pay GST on purchases (input tax). They pay the difference to IRD. GST-inclusive price = GST-exclusive price × 1.15. To find the GST-exclusive price from a GST-inclusive price, divide by 1.15 (NOT multiply by 0.85). GST is NOT an expense for GST-registered businesses.",
        example:
          "A product costs $100 + GST. GST = $100 × 0.15 = $15. GST-inclusive price = $115. To go back: $115 / 1.15 = $100 (not $115 × 0.85 = $97.75 — that's wrong!).",
      },
      {
        title: "Double Entry Bookkeeping",
        explanation:
          "Every transaction has two entries: a debit and a credit. Debits increase assets and expenses. Credits increase liabilities, equity, and revenue. Think DEAD CLIC: Debits for Expenses, Assets, Drawings. Credits for Liabilities, Income, Capital. The total debits must always equal total credits.",
        example:
          "Business buys inventory for $500 cash. Debit: Inventory (asset increases) $500. Credit: Cash (asset decreases) $500. Both are assets — one goes up, one goes down.",
      },
      {
        title: "Ratio Analysis",
        explanation:
          "Financial ratios help assess business performance. Profitability: Net Profit Percentage = (Net Profit / Revenue) × 100. Liquidity: Current Ratio = Current Assets / Current Liabilities (should be between 1.5 and 2). Return on Equity: Net Profit / Owner's Equity × 100. Compare ratios year-on-year or with industry benchmarks to identify trends.",
      },
    ],
    commonMistakes: [
      {
        mistake: "Getting debits and credits the wrong way around",
        fix: "Learn DEAD CLIC: Debits increase Expenses, Assets, Drawings. Credits increase Liabilities, Income, Capital. If cash (an asset) increases, it's a debit. If cash decreases, it's a credit.",
      },
      {
        mistake: "Forgetting to account for GST correctly",
        fix: "For GST-registered businesses, record amounts GST-exclusive in revenue and expenses. The GST portion goes to a GST account. To find GST-exclusive from inclusive: divide by 1.15, don't multiply by 0.85.",
      },
      {
        mistake: "Statement of Financial Position not balancing",
        fix: "If it doesn't balance, the error is in your workings. Check: (1) all items are in the right category, (2) drawings are deducted from equity, not listed as an expense, (3) profit from the Income Statement is added to equity.",
      },
      {
        mistake: "Confusing drawings with expenses",
        fix: "Owner drawings (taking cash or goods for personal use) are NOT expenses — they reduce owner's equity directly. They don't appear on the Income Statement. They go in the equity section of the Balance Sheet.",
      },
      {
        mistake: "Mixing up cash and accrual accounting",
        fix: "NCEA accounting uses accrual basis. Revenue is recorded when earned (goods delivered), not when cash is received. Expenses are recorded when incurred, not when paid. Accounts receivable and accounts payable handle the timing difference.",
      },
    ],
    examTips: [
      "Always rule up financial statements properly with correct headings (business name, statement name, date/period).",
      "Show your workings for every calculation, especially GST calculations and ratio analysis.",
      "When preparing financial statements, work through transactions chronologically — don't skip ahead.",
      "For NZD amounts, use two decimal places consistently ($1,250.00 not $1250).",
      "If the Balance Sheet doesn't balance, don't just fudge a number. Go back and find your error — markers can see this.",
      "For Excellence, interpret and explain ratios in context — don't just calculate them. What do they tell the owner about their business?",
    ],
    formulas: [
      { name: "Accounting Equation", formula: "Assets = Liabilities + Owner's Equity", when: "Foundation of every accounting entry" },
      { name: "Profit", formula: "Profit = Revenue - Expenses", when: "Calculating profit on the Income Statement" },
      { name: "GST Inclusive", formula: "GST-inclusive = GST-exclusive × 1.15", when: "Adding 15% GST to a price" },
      { name: "GST Exclusive", formula: "GST-exclusive = GST-inclusive ÷ 1.15", when: "Removing GST from a price (NOT × 0.85)" },
      { name: "Net Profit %", formula: "Net Profit % = (Net Profit / Revenue) × 100", when: "Measuring profitability" },
      { name: "Current Ratio", formula: "Current Ratio = Current Assets / Current Liabilities", when: "Measuring short-term liquidity" },
    ],
  },

  geography: {
    subject: "geography",
    label: "Geography",
    description:
      "Natural processes, human geography, map skills, and geographic thinking for NCEA Geography.",
    icon: "\u{1F30F}", // globe
    keyConcepts: [
      {
        title: "Natural Processes — Tectonics",
        explanation:
          "New Zealand sits on the boundary of the Pacific and Australian tectonic plates. The North Island has volcanic activity because the Pacific Plate subducts under the Australian Plate, creating the Taupo Volcanic Zone. The South Island has the Alpine Fault (transform boundary), causing earthquakes. Understanding plate tectonics explains NZ's earthquakes, volcanoes, geothermal activity, and mountain building.",
        example:
          "The 2011 Christchurch earthquake was caused by movement on a previously unknown fault near the city. The Alpine Fault is overdue for a major rupture, expected to be magnitude 8+.",
      },
      {
        title: "Natural Processes — Weather and Climate",
        explanation:
          "NZ's weather is influenced by its mid-latitude position, surrounding oceans, and mountain ranges. Prevailing westerly winds bring moisture from the Tasman Sea. The Southern Alps force air upward (orographic lift), causing heavy rainfall on the West Coast and a rain shadow on the Canterbury Plains. El Nino brings more south-westerly winds and cooler temperatures to NZ; La Nina brings warmer, more subtropical conditions.",
      },
      {
        title: "Human Geography — Urban Patterns",
        explanation:
          "Urban areas grow and change over time. Push factors (crime, pollution, lack of space) drive people away from cities. Pull factors (jobs, services, lifestyle) attract people to areas. Suburbanisation spreads cities outward. Gentrification transforms lower-income neighbourhoods as wealthier people move in. Sustainability challenges include transport, housing affordability, and environmental impact.",
        example:
          "Auckland's housing crisis: population growth creates demand, but geographic constraints (harbour, ranges) limit land supply. The Urban Development Authority aims to increase housing density.",
      },
      {
        title: "Map Skills",
        explanation:
          "Grid references: 6-figure grid references give a precise location. Read along the bottom (eastings) first, then up the side (northings) — 'along the corridor, up the stairs'. Contour lines show elevation — close together means steep, far apart means flat. Scale: 1:50,000 means 1 cm on the map = 500 m in real life. Cross-sections show the profile of the land between two points using contour lines.",
      },
      {
        title: "Geographic Concepts",
        explanation:
          "Key concepts to weave into your answers: Sustainability (meeting present needs without compromising the future), Perspectives (different groups view geographic issues differently — Maori, developers, conservationists), Interaction (how humans and the environment affect each other), Change (how places and processes evolve over time), Pattern (spatial distribution of features), Process (the sequence of events that shapes a landscape).",
      },
    ],
    commonMistakes: [
      {
        mistake: "Not using geographic terminology",
        fix: "Say 'orographic rainfall' not 'rain from mountains'. Say 'subduction zone' not 'where plates go under'. Say 'urban sprawl' not 'cities getting bigger'. Terminology shows the marker you understand the concepts and earns you higher grades.",
      },
      {
        mistake: "Weak or missing case study references",
        fix: "Always use specific NZ examples with place names, dates, and statistics. 'The 2016 Kaikoura earthquake (M7.8) caused vertical uplift of up to 6 metres along the coast' is much stronger than 'there was a big earthquake'.",
      },
      {
        mistake: "Poor map reading in grid references",
        fix: "Remember: eastings FIRST, then northings. For 6-figure references, estimate the third digit as tenths across the grid square. Practice reading contour maps — know what close contours (steep), V-shapes (valleys/spurs), and concentric circles (hills) look like.",
      },
      {
        mistake: "Describing without explaining",
        fix: "Don't just describe what happens — explain WHY it happens and what the CONSEQUENCES are. 'The west coast receives 5000mm of rainfall (description) because prevailing westerlies are forced upward by the Southern Alps, cooling and condensing (explanation)'.",
      },
      {
        mistake: "Ignoring different perspectives",
        fix: "For Excellence, discuss how different groups view the same issue. A new highway might benefit commuters but concern tangata whenua if it crosses culturally significant land. Always consider economic, social, cultural, and environmental viewpoints.",
      },
    ],
    examTips: [
      "Use specific NZ case studies with data (place names, dates, statistics) — vague answers get lower marks.",
      "Draw annotated diagrams (e.g., cross-sections, plate boundaries) to support your written answers.",
      "For geographic concepts questions, clearly name the concept and explain how it applies to your case study.",
      "Structure long answers with an introduction, body paragraphs (one per point), and a conclusion — just like an essay.",
      "Always discuss both natural AND human factors when examining geographic issues.",
      "For Excellence, evaluate and make judgements — which factor is most significant? What are the long-term implications?",
    ],
  },
};

/** All subjects that have study guides, ordered for display */
export const guideSubjects = [
  "mathematics",
  "english",
  "science",
  "biology",
  "chemistry",
  "physics",
  "statistics",
  "economics",
  "accounting",
  "geography",
] as const;

/** Quick lookup: does this subject have a study guide? */
export function hasGuide(subject: string): boolean {
  return subject in subjectGuides;
}
