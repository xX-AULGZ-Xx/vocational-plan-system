const fs = require('fs');
const file = 'apps/api/src/modules/projects/project.controller.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the PUT block with a transaction
const oldBlock = \    // Delete existing relations to replace
    await prisma.projectAlignment.deleteMany({ where: { project_id: projectId } });
    await prisma.projectTimeline.deleteMany({ where: { project_id: projectId } });
    await prisma.projectBudgetItem.deleteMany({ where: { project_id: projectId } });

    const updatedProject = await prisma.project.update({\;

const newBlock = \    // Wrap in transaction to prevent partial updates
    const updatedProject = await prisma.\\(async (tx) => {
      await tx.projectAlignment.deleteMany({ where: { project_id: projectId } });
      await tx.projectTimeline.deleteMany({ where: { project_id: projectId } });
      await tx.projectBudgetItem.deleteMany({ where: { project_id: projectId } });

      return await tx.project.update({\;

code = code.replace(oldBlock, newBlock);

// Also need to close the transaction block
const oldClose = \          }),
        },
      },
    });\;

const newClose = \          }),
        },
      },
    });
    });\;

code = code.replace(oldClose, newClose);

fs.writeFileSync(file, code);
console.log('Patched with transaction');
