import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tags, Plus, Search, Trash2, ChevronRight } from 'lucide-react';
import SlideDrawer from '../components/common/SlideDrawer';
import { supabase } from '../server/supabase/supabase';
import { isValidUUID } from '../utils/securityUtils';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', description: '', parent_id: '' });
  const [saving, setSaving] = useState(false);

  // Subcategory toggle + cascade path state
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [cascadePath, setCascadePath] = useState([]);

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`*, products(count)`)
        .order('name');

      if (error) throw error;

      if (data) {
        setCategories(data.map(c => ({
          ...c,
          items: c.products?.[0]?.count || 0,
        })));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Derived maps ────────────────────────────────────────────────────────────

  const categoryPaths = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.id] = c; });

    const paths = {};
    const getPath = (id) => {
      if (paths[id]) return paths[id];
      const cat = map[id];
      if (!cat) return '';
      if (!cat.parent_id) { paths[id] = cat.name; return cat.name; }
      const parentPath = getPath(cat.parent_id);
      paths[id] = parentPath ? `${parentPath} › ${cat.name}` : cat.name;
      return paths[id];
    };
    categories.forEach(c => getPath(c.id));
    return paths;
  }, [categories]);

  // parentId (or '__root__') → direct children array
  const categoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

  // ─── Tree builder — returns rows in tree order with depth + ancestorNames ───

  const flattenedTree = useMemo(() => {
    const childMap = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!childMap[key]) childMap[key] = [];
      childMap[key].push(c);
    });
    Object.keys(childMap).forEach(key => {
      childMap[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    const result = [];
    function walk(parentKey, depth, ancestorNames) {
      const children = childMap[parentKey] || [];
      children.forEach((cat) => {
        result.push({ ...cat, depth, ancestorNames });
        walk(cat.id, depth + 1, [...ancestorNames, cat.name]);
      });
    }
    walk('__root__', 0, []);
    return result;
  }, [categories]);

  // ─── Form handlers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setNewCat({ name: '', description: '', parent_id: '' });
    setIsSubcategory(false);
    setCascadePath([]);
  };

  const handleOpenModal = () => { resetForm(); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); resetForm(); };

  const handleLevelSelect = (depth, selectedId) => {
    if (!selectedId) {
      const newPath = cascadePath.slice(0, depth);
      setCascadePath(newPath);
      setNewCat(prev => ({ ...prev, parent_id: newPath[newPath.length - 1] || '' }));
      return;
    }
    const newPath = [...cascadePath.slice(0, depth), selectedId];
    setCascadePath(newPath);
    setNewCat(prev => ({ ...prev, parent_id: selectedId }));
  };

  const handleSubcategoryToggle = (checked) => {
    setIsSubcategory(checked);
    if (!checked) { setCascadePath([]); setNewCat(prev => ({ ...prev, parent_id: '' })); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{
        name: newCat.name,
        description: newCat.description,
        parent_id: newCat.parent_id || null,
      }]);
      if (error) throw error;
      handleCloseModal();
      fetchCategories();
    } catch (err) {
      alert('Failed to create category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!isValidUUID(id)) return;
    if (!window.confirm('Are you sure you want to delete this category? All linked entities will be uncategorized.')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      alert('Failed to delete category: ' + err.message);
    }
  };

  // ─── Breadcrumb label for confirmed parent ───────────────────────────────────

  const selectedBreadcrumb = useMemo(() => {
    if (!newCat.parent_id || cascadePath.length === 0) return '';
    return cascadePath
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(' › ');
  }, [newCat.parent_id, cascadePath, categories]);

  // ─── Filtered list (tree-ordered) ───────────────────────────────────────────

  const filtered = flattenedTree.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Categories</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Inventory Classification Logic</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={16} strokeWidth={3} /> Register Category
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative group w-full max-w-md">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Lookup Category Entity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Table — original structure, tree-ordered rows */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Entities Linked</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && categories.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Syncing Classifications...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">No Classifications Found</td></tr>
              ) : filtered.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50 group transition-colors">

                  {/* ID Code Column with Tree Connector */}
                  <td className="px-8 py-5 font-mono text-[11px] font-black text-black align-middle relative">
                    {/* Parent-to-child vertical stem starting from below the parent row ID */}
                    {(categoryChildMap[cat.id] || []).length > 0 && (
                      <div
                        className="absolute bottom-0 w-px bg-gray-200"
                        style={{
                          top: '42px',
                          left: `${32 + cat.depth * 28 + 10}px`
                        }}
                      />
                    )}

                    {/* Hierarchical tree connectors */}
                    {Array.from({ length: cat.depth }).map((_, i) => {
                      const isLastConnector = i === cat.depth - 1;
                      if (isLastConnector) {
                        return (
                          <React.Fragment key={i}>
                            {/* Vertical top-half line */}
                            <div
                              className="absolute top-0 w-px bg-gray-200"
                              style={{
                                height: '50%',
                                left: `${32 + i * 28 + 10}px`
                              }}
                            />
                            {/* Horizontal arm pointing to the ID text */}
                            <div
                              className="absolute h-px bg-gray-200"
                              style={{
                                top: '50%',
                                left: `${32 + i * 28 + 10}px`,
                                width: '8px'
                              }}
                            />
                            {/* Solid triangle arrow tip at the end of the line */}
                            <div
                              className="absolute flex items-center justify-center text-gray-300"
                              style={{
                                top: '50%',
                                transform: 'translateY(-50%)',
                                left: `${32 + i * 28 + 10 + 8}px`,
                                width: '6px',
                                height: '6px'
                              }}
                            >
                              <svg viewBox="0 0 6 6" className="w-1.5 h-1.5 fill-current">
                                <path d="M0 0l6 3-6 3z" />
                              </svg>
                            </div>
                          </React.Fragment>
                        );
                      } else {
                        return (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-gray-200"
                            style={{
                              left: `${32 + i * 28 + 10}px`
                            }}
                          />
                        );
                      }
                    })}

                    {/* ID text indented based on depth and aligned vertically */}
                    <div 
                      className="flex items-center min-h-[20px]"
                      style={{ paddingLeft: cat.depth * 28 }}
                    >
                      {cat.id.slice(0, 8)}
                    </div>
                  </td>

                  {/* Classification Column (Clean and Normal) */}
                  <td className="px-8 py-5 align-middle">
                    <div className="flex items-center gap-2">
                      <Tags
                        size={13}
                        className="text-gray-400 group-hover:text-black transition-colors flex-shrink-0"
                      />
                      <span className={`uppercase tracking-tight ${
                        cat.depth === 0
                          ? 'text-[12px] font-black text-black'
                          : 'text-[11px] font-bold text-black'
                      }`}>
                        {cat.name}
                      </span>
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-xs truncate align-top">
                    {cat.description || 'No description provided'}
                  </td>

                  {/* Entities Linked */}
                  <td className="px-8 py-5 text-center text-[12px] font-black text-black align-top">
                    {cat.items || '—'}
                  </td>

                  {/* Action */}
                  <td className="px-8 py-5 text-right align-top">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New Category Drawer ─────────────────────────────────────────────────── */}
      <SlideDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        title="New Category"
        subtitle="Add new category"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleCreateCategory} className="space-y-6">

            {/* Category Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                Category Name
              </label>
              <input
                type="text"
                required
                value={newCat.name}
                onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="E.g. Sunglasses"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Is a subcategory? checkbox */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSubcategory}
                    onChange={e => handleSubcategoryToggle(e.target.checked)}
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSubcategory
                      ? 'bg-black border-black'
                      : 'bg-white border-gray-200 group-hover:border-gray-400'
                  }`}>
                    {isSubcategory && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-black text-black uppercase tracking-widest">
                  Is a subcategory?
                </span>
              </label>

              {/* Cascading parent picker */}
              {isSubcategory && (
                <div className="ml-8 space-y-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Parent Category
                  </p>

                  {/* Level 0: Root */}
                  {(categoryChildMap['__root__'] || []).length > 0 && (
                    <CascadeLevel
                      depth={0}
                      options={categoryChildMap['__root__'] || []}
                      selectedId={cascadePath[0] || ''}
                      onSelect={id => handleLevelSelect(0, id)}
                    />
                  )}

                  {/* Subsequent levels */}
                  {cascadePath.map((selectedId, depth) => {
                    const children = categoryChildMap[selectedId] || [];
                    if (children.length === 0) return null;
                    return (
                      <CascadeLevel
                        key={selectedId}
                        depth={depth + 1}
                        options={children}
                        selectedId={cascadePath[depth + 1] || ''}
                        onSelect={id => handleLevelSelect(depth + 1, id)}
                      />
                    );
                  })}

                  {/* Breadcrumb confirmation — show resolved parent */}
                  {newCat.parent_id && cascadePath.length > 0 && (() => {
                    const lastId = cascadePath[cascadePath.length - 1];
                    const hasChildren = (categoryChildMap[lastId] || []).length > 0;
                    const breadcrumb = cascadePath
                      .map(id => categories.find(c => c.id === id)?.name)
                      .filter(Boolean)
                      .join(' › ');
                    return (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-black rounded-xl">
                          <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                          <span className="text-[9px] font-black text-white uppercase tracking-widest truncate flex-1">
                            ✓ Parent: {breadcrumb}
                          </span>
                        </div>
                        {hasChildren && (
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            ↳ You can pick a deeper sub-level above, or submit as-is to place under "{categories.find(c => c.id === lastId)?.name}"
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                Description
              </label>
              <textarea
                rows="3"
                value={newCat.description}
                onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none resize-none transition-all"
                placeholder="Define the bounds of this entity..."
              />
            </div>

            {/* Actions */}
            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
              >
                Abort
              </button>
              <button
                type="submit"
                disabled={saving || (isSubcategory && !newCat.parent_id)}
                className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
              >
                {saving ? 'Syncing...' : 'Commit Registration'}
              </button>
            </div>

          </form>
        </div>
      </SlideDrawer>

    </div>
  );
}

// ─── CascadeLevel sub-component ─────────────────────────────────────────────

function CascadeLevel({ depth, options, selectedId, onSelect }) {
  const levelLabels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
  const label = levelLabels[depth] || `Level ${depth + 1}`;

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute -top-3 left-3 flex items-center gap-1">
          <div className="w-px h-3 bg-gray-200" />
          <ChevronRight size={10} className="text-gray-300 -ml-0.5" />
        </div>
      )}
      <div className={`rounded-xl overflow-hidden border transition-all ${
        selectedId ? 'border-black bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center px-4 py-0.5 border-b border-gray-50">
          <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">
            {label}
          </span>
        </div>
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer text-black appearance-none"
        >
          <option value="">— Select —</option>
          {options.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
