import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    Plus, Edit2, Trash2, AlignLeft, Layers, AlertCircle, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CONFIG_GROUPS = [
    {
        id: 'travel',
        label: 'Travel Module',
        tables: [
            { id: 'travel-mode', name: 'Travel Modes', endpoint: 'travel-mode-masters', fields: ['mode_name', 'status'] },
            { id: 'travel-provider', name: 'Providers', endpoint: 'provider-masters', fields: ['provider_name', 'is_flight', 'is_train', 'is_bus', 'is_intercity_cab', 'status'] },
            { id: 'travel-operator', name: 'Operators', endpoint: 'operator-masters', fields: ['operator_name', 'is_flight', 'is_train', 'is_bus', 'status'] },
            { id: 'travel-class', name: 'Travel Classes', endpoint: 'travel-class-masters', fields: ['class_name', 'is_flight', 'is_train', 'is_bus', 'status'] },
            { id: 'travel-vehicle', name: 'Vehicles', endpoint: 'vehicle-masters', fields: ['vehicle_name', 'is_bus', 'is_intercity_cab', 'status'] },
            { id: 'booking-type', name: 'Booking Types', endpoint: 'booking-type-masters', fields: ['booking_type', 'status'] },
            { id: 'ticket-status', name: 'Ticket Statuses', endpoint: 'ticket-status-masters', fields: ['status_name', 'is_flight', 'is_train', 'is_bus', 'is_intercity_cab', 'status'] },
            { id: 'quota-type', name: 'Quota Types', endpoint: 'quota-type-masters', fields: ['quota_name', 'status'] }
        ]
    },
    {
        id: 'local',
        label: 'Local Conveyance',
        tables: [
            { id: 'local-mode', name: 'Travel Modes', endpoint: 'local-travel-mode-masters', fields: ['mode_name', 'status'] },
            { id: 'local-provider', name: 'Providers', endpoint: 'local-provider-masters', fields: ['provider_name', 'is_car', 'is_bike', 'is_auto', 'is_bus', 'is_metro', 'status'] },
            { id: 'local-subtype', name: 'Sub Types', endpoint: 'local-sub-type-masters', fields: ['sub_type', 'is_car', 'is_bike', 'is_auto', 'status'] }
        ]
    },
    {
        id: 'stay',
        label: 'Stay & Lodging',
        tables: [
            { id: 'stay-type', name: 'Stay Types', endpoint: 'stay-type-masters', fields: ['stay_type', 'status'] },
            { id: 'room-type', name: 'Room Types', endpoint: 'room-type-masters', fields: ['room_type', 'status'] },
            { id: 'stay-booking', name: 'Booking Types', endpoint: 'stay-booking-type-masters', fields: ['booking_type', 'status'] },
            { id: 'stay-source', name: 'Booking Sources', endpoint: 'stay-booking-source-masters', fields: ['source_name', 'status'] }
        ]
    },
    {
        id: 'food',
        label: 'Food & Refreshments',
        tables: [
            { id: 'meal-cat', name: 'Meal Categories', endpoint: 'meal-category-masters', fields: ['category_name', 'status'] },
            { id: 'meal-type', name: 'Meal Types', endpoint: 'meal-type-masters', fields: ['meal_type', 'status'] },
            { id: 'meal-source', name: 'Meal Sources', endpoint: 'meal-source-masters', fields: ['source_name', 'status'] },
            { id: 'meal-provider', name: 'Meal Providers', endpoint: 'meal-provider-masters', fields: ['provider_name', 'status'] }
        ]
    },
    {
        id: 'incidental',
        label: 'Incidental Expenses',
        tables: [
            { id: 'incidental-type', name: 'Incidental Types', endpoint: 'incidental-type-masters', fields: ['expense_type', 'category', 'status'] }
        ]
    }
];

export default function AdminMasterManagement() {
    const { showToast } = useToast() || { showToast: () => { } };

    const [activeGroup, setActiveGroup] = useState(CONFIG_GROUPS[0]);
    const [activeTab, setActiveTab] = useState(CONFIG_GROUPS[0].tables[0]);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fieldMetadata, setFieldMetadata] = useState({});

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [showDeleted, setShowDeleted] = useState(false);

    const visibleFields = activeTab.fields;

    useEffect(() => {
        fetchData();
    }, [activeTab, showDeleted]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/${activeTab.endpoint}/`;
            if (showDeleted) url += '?include_deleted=true';

            // Try fetching field metadata
            try {
                const optionsRes = await api.options(url);
                const actions = optionsRes.data?.actions;
                if (actions && (actions.POST || actions.PUT)) {
                    setFieldMetadata(actions.POST || actions.PUT);
                } else {
                    setFieldMetadata({});
                }
            } catch (err) {
                console.warn("Could not fetch field metadata via OPTIONS", err);
                setFieldMetadata({});
            }

            const res = await api.get(url);
            setData(res.data);
        } catch (error) {
            console.error("Fetch failed", error);
            showToast("Failed to load table data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData({ ...item });
        } else {
            const initial = {};
            activeTab.fields.forEach(f => {
                if (fieldMetadata[f]?.type === 'boolean' || f.startsWith('is_') || f === 'status') {
                    initial[f] = false;
                } else if (f === 'category') {
                    initial[f] = 'general_incidental'; // Default
                } else {
                    initial[f] = '';
                }
            });
            setFormData(initial);
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/api/${activeTab.endpoint}/${editingItem.id}/`, formData);
                showToast("Updated successfully", "success");
            } else {
                await api.post(`/api/${activeTab.endpoint}/`, formData);
                showToast("Created successfully", "success");
            }
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            const errorData = error.response?.data;
            const firstFieldError = errorData && typeof errorData === 'object'
                ? Object.values(errorData).flat().find(Boolean)
                : null;
            showToast(firstFieldError || errorData?.detail || "Operation failed", "error");
        }
    };

    const confirmDelete = (id) => {
        setDeletingId(id);
        setIsConfirmOpen(true);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/api/${activeTab.endpoint}/${deletingId}/`);
            showToast("Deleted successfully", "success");
            setIsConfirmOpen(false);
            fetchData();
        } catch (error) {
            showToast("Deletion failed", "error");
        }
    };

    const handleRestore = async (id) => {
        try {
            await api.post(`/api/${activeTab.endpoint}/${id}/restore/`);
            showToast("Restored successfully", "success");
            fetchData();
        } catch (error) {
            showToast("Restoration failed", "error");
        }
    };

    return (
        <div className="content-inner animate-fade-in">
            <div className="admin-mgmt-header">
                <h1>Master Data Management</h1>
                <p>Configure system hierarchies and static master tables for all application modules.</p>
            </div>

            <div className="trip-category-toggle">
                {CONFIG_GROUPS.map(group => (
                    <button
                        key={group.id}
                        className={`module-btn ${activeGroup.id === group.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveGroup(group);
                            setActiveTab(group.tables[0]);
                        }}
                    >
                        <Layers size={18} />
                        {group.label}
                    </button>
                ))}
            </div>

            <div className="admin-content-grid">
                {/* Sidebar */}
                <div className="glass premium-card">
                    <h3 className="sidebar-title">Available Tables</h3>
                    <div className="master-selector-list">
                        {activeGroup.tables.map(table => (
                            <button
                                key={table.id}
                                className={`master-selector-btn ${activeTab.id === table.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(table)}
                            >
                                <AlignLeft size={16} style={{ marginRight: '10px' }} />
                                {table.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Data Panel */}
                <div className="glass premium-card">
                    <div className="panel-header">
                        <h2>{activeTab.name}</h2>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button 
                                className={`action-btn ${showDeleted ? 'active' : ''}`} 
                                style={{ width: 'auto', padding: '0 12px', fontSize: '12px', height: '36px', display: 'flex', gap: '6px', alignItems: 'center', background: showDeleted ? '#eff6ff' : 'white', border: `1px solid ${showDeleted ? '#3b82f6' : '#e2e8f0'}`, color: showDeleted ? '#2563eb' : '#64748b' }}
                                onClick={() => setShowDeleted(!showDeleted)}
                                title={showDeleted ? "Hide inactive records" : "Show deleted/inactive records"}
                            >
                                {showDeleted ? <EyeOff size={14} /> : <Eye size={14} />}
                                {showDeleted ? "Hide Inactive" : "Show Inactive"}
                            </button>
                            <button className="add-btn" onClick={() => handleOpenForm()}>
                                <Plus size={18} />
                                Add Record
                            </button>
                        </div>
                    </div>

                    <div className="data-table-container">
                        {loading ? (
                            <div className="loading-state">
                                <div className="loader"></div>
                                <p>Fetching data...</p>
                            </div>
                        ) : (
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        {visibleFields.map(f => (
                                            <th key={f}>{f.replace(/_/g, ' ').toUpperCase()}</th>
                                        ))}
                                        <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length > 0 ? data.map(item => (
                                        <tr key={item.id} style={{ opacity: item.is_deleted ? 0.6 : 1, backgroundColor: item.is_deleted ? '#f9fafb' : 'transparent' }}>
                                            <td><span className="id-badge" style={{ background: item.is_deleted ? '#f1f5f9' : '#e0f2fe', color: item.is_deleted ? '#94a3b8' : '#0369a1' }}>{item.id} {item.is_deleted && '(Inactive)'}</span></td>
                                            {visibleFields.map(f => (
                                                <td key={f}>
                                                    {fieldMetadata[f]?.type === 'boolean' || typeof item[f] === 'boolean' ? (
                                                        <span style={{
                                                            color: (item[f] === true || String(item[f]).toLowerCase() === 'true' || item[f] === 1) ? '#059669' : '#dc2626',
                                                            fontWeight: 'bold',
                                                            background: (item[f] === true || String(item[f]).toLowerCase() === 'true' || item[f] === 1) ? '#ecfdf5' : '#fef2f2',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.8rem',
                                                            display: 'inline-block'
                                                        }}>
                                                            {(item[f] === true || String(item[f]).toLowerCase() === 'true' || item[f] === 1) ? 'TRUE' : 'FALSE'}
                                                        </span>
                                                    ) : f === 'category' ? (
                                                        <span style={{
                                                            color: '#475569', fontWeight: '600', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', display: 'inline-block'
                                                        }}>
                                                            {String(item[f] || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                        </span>
                                                    ) : (
                                                        item[f] === null || item[f] === undefined ? '' : String(item[f])
                                                    )}
                                                </td>
                                            ))}
                                            <td>
                                                <div className="action-row">
                                                    {item.is_deleted ? (
                                                        <button className="action-btn" style={{ color: '#2563eb', background: '#eff6ff' }} title="Restore" onClick={() => handleRestore(item.id)}>
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button className="action-btn edit-btn" title="Edit" onClick={() => handleOpenForm(item)}>
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button className="action-btn delete-btn" title="Delete" onClick={() => confirmDelete(item.id)}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={visibleFields.length + 2} className="empty-row">No records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isFormOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="modal-title">{editingItem ? 'Edit Record' : 'Add New Record'}</h2>
                        <form onSubmit={handleSave}>
                            {visibleFields.map(field => (
                                <div key={field} className="form-field">
                                    <label>{field.replace(/_/g, ' ').toUpperCase()}</label>
                                    {field === 'category' ? (
                                        <select
                                            className="form-select"
                                            value={formData[field] || ''}
                                            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            <option value="local_conveyance">Local Conveyance</option>
                                            <option value="travel_incidental">Travel Incidental</option>
                                            <option value="general_incidental">General Incidental</option>
                                        </select>
                                    ) : fieldMetadata[field]?.type === 'boolean' || typeof formData[field] === 'boolean' || field.startsWith('is_') || field === 'status' ? (
                                        <input
                                            type="checkbox"
                                            className="form-checkbox-custom"
                                            checked={formData[field] === true || String(formData[field]).toLowerCase() === 'true' || formData[field] === 1}
                                            onChange={e => setFormData({ ...formData, [field]: e.target.checked })}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData[field] || ''}
                                            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                                            placeholder={`Enter ${field}...`}
                                            required
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsFormOpen(false)}>Cancel</button>
                                <button type="submit" className="save-btn">{editingItem ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Form */}
            {isConfirmOpen && (
                <div className="modal-overlay">
                    <div className="modal-content confirm-modal">
                        <div className="confirm-icon"><AlertCircle size={32} /></div>
                        <h2>Confirm Deletion</h2>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>Are you sure you want to delete this record?</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setIsConfirmOpen(false)}>No, Keep it</button>
                            <button className="save-btn" style={{ background: '#CB6040' }} onClick={handleDelete}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
