      {/* Read-Only Form View */}
      {activeTab === 'preview' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-xl font-bold text-slate-900">???????????????????????????????????</h2>
              <p className="text-sm text-slate-500">????????????????????????????? (Read-Only)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">???????????</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                  {project.title || '-'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">???????????</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                  {project.project_code || '-'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">??????????</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                  {project.fiscal_year || '-'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">?????????? / ????</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                  {project.department?.name || '-'} {project.department?.division?.name ? \(\)\ : ''}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">??????????????</label>
                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                  {project.leader?.full_name || '-'} {project.leader?.position ? \(\)\ : ''}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">????????????????</label>
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                {project.background || '-'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">????????????</label>
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                {Array.isArray(project.objectives) && project.objectives.length > 0 ? (
                  <ul className="list-decimal pl-5 space-y-1">
                    {project.objectives.map((obj: string, i: number) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">??????????????????</label>
                <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 whitespace-pre-wrap min-h-[80px]">
                  {project.target_groups?.quantitative || '-'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">??????????????????</label>
                <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 whitespace-pre-wrap min-h-[80px]">
                  {project.target_groups?.qualitative || '-'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">???????????????????</label>
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 whitespace-pre-wrap min-h-[80px]">
                {project.expected_results || '-'}
              </div>
            </div>

          </div>
        </div>
      )}
