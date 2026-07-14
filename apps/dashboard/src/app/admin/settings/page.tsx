'use client';

/**
 * Admin — System Settings
 */

export default function SettingsPage() {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* General */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>General Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SettingRow label="SOS Cooldown" description="Minimum time between SOS triggers" value="60 seconds" />
            <SettingRow label="Journey Overdue Threshold" description="Minutes after ETA before marking overdue" value="5 minutes" />
            <SettingRow label="Auto-Assign Radius" description="Max distance for auto-assigning officers" value="5 km" />
            <SettingRow label="Evidence Retention" description="How long to keep encrypted evidence" value="90 days" />
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Notification Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ToggleSetting label="SOS Admin Alerts" description="Notify admins on every new SOS" enabled={true} />
            <ToggleSetting label="Overdue Journey Alerts" description="Alert admin when journey is overdue" enabled={true} />
            <ToggleSetting label="Officer Assignment Notifications" description="Push to officers on case assignment" enabled={true} />
            <ToggleSetting label="Daily Analytics Email" description="Send daily summary to admin email" enabled={false} />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ borderColor: 'var(--danger-muted)' }}>
          <h3 style={{ marginBottom: 8, color: 'var(--danger)' }}>Danger Zone</h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>Irreversible actions. Proceed with caution.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-danger btn-sm">Reset All Settings</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Clear Analytics Data</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{description}</div>
      </div>
      <input type="text" defaultValue={value} style={{ width: 150, textAlign: 'right' }} />
    </div>
  );
}

function ToggleSetting({ label, description, enabled }: { label: string; description: string; enabled: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{description}</div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: enabled ? 'var(--primary)' : 'var(--border)',
        position: 'relative', cursor: 'pointer',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 10,
          background: 'white', position: 'absolute',
          top: 2, left: enabled ? 22 : 2,
          transition: 'left 150ms ease',
        }} />
      </div>
    </div>
  );
}
