const fs = require('fs');

let code = fs.readFileSync('src/modules/projects/project.controller.ts', 'utf8');

// POST /
code = code.replace(
  `      expected_results,
      status = 'draft',
      alignments = [],`,
  `      expected_results,
      status = 'draft',
      dynamic_data,
      alignments = [],`
);

code = code.replace(
  `        expected_results,
        status: status === 'submitted' ? ProjectStatus.submitted : ProjectStatus.draft,
        total_budget: totalBudget,`,
  `        expected_results,
        dynamic_data: dynamic_data ? JSON.stringify(dynamic_data) : undefined,
        status: status === 'submitted' ? ProjectStatus.submitted : ProjectStatus.draft,
        total_budget: totalBudget,`
);


// PUT /:id
code = code.replace(
  `      expected_results,
      status,
      alignments = [],`,
  `      expected_results,
      status,
      dynamic_data,
      alignments = [],`
);

code = code.replace(
  `        expected_results,
        status: status ? (status === 'submitted' ? ProjectStatus.submitted : ProjectStatus.draft) : undefined,
        total_budget: totalBudget,`,
  `        expected_results,
        dynamic_data: dynamic_data ? JSON.stringify(dynamic_data) : undefined,
        status: status ? (status === 'submitted' ? ProjectStatus.submitted : ProjectStatus.draft) : undefined,
        total_budget: totalBudget,`
);


fs.writeFileSync('src/modules/projects/project.controller.ts', code);
console.log('Fixed project controller');
