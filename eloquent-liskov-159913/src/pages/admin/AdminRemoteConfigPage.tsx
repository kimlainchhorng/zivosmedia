/**
 * Admin Remote Config Management Panel
 * Allows admins to update app settings without releasing updates
 */

import { useState, useEffect } from 'react';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Setting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminRemoteConfigPanel() {
  const { updateSetting, refresh, config, loading, error } = useRemoteConfig();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newSetting, setNewSetting] = useState({ key: '', value: '', description: '' });
  const [tab, setTab] = useState('pricing');

  // Fetch all settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('tenant_id', null)
        .order('key');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: unknown, description?: string) => {
    setIsSaving(true);
    try {
      await updateSetting(key, value, description);
      setSuccessMessage(`Updated ${key}`);
      await fetchSettings();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSetting = async () => {
    if (!newSetting.key || !newSetting.value) {
      setFetchError('Key and value are required');
      return;
    }

    try {
      let value: unknown = newSetting.value;
      // Try to parse as JSON if it looks like an object/array
      if (newSetting.value.startsWith('{') || newSetting.value.startsWith('[')) {
        value = JSON.parse(newSetting.value);
      } else if (newSetting.value === 'true' || newSetting.value === 'false') {
        value = newSetting.value === 'true';
      }

      await handleUpdateSetting(newSetting.key, value, newSetting.description);
      setNewSetting({ key: '', value: '', description: '' });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Invalid value format');
    }
  };

  const handleDeleteSetting = async (id: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSettings();
      setSuccessMessage('Setting deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to delete setting');
    }
  };

  const renderValue = (value: unknown) => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const pricingSettings = settings.filter(s =>
    s.key.toUpperCase().includes('PRICE') ||
    s.key.toUpperCase().includes('FEE') ||
    s.key.toUpperCase().includes('COMMISSION') ||
    s.key.toUpperCase().includes('MARKUP') ||
    s.key.toUpperCase().includes('DELIVERY')
  );

  const featureSettings = settings.filter(s =>
    s.key.toUpperCase().includes('ENABLED') ||
    s.key.toUpperCase().includes('FEATURE') ||
    s.key.toUpperCase().includes('MODE')
  );

  const contentSettings = settings.filter(s =>
    s.key.toUpperCase().includes('MESSAGE') ||
    s.key.toUpperCase().includes('TEXT') ||
    s.key.toUpperCase().includes('TITLE') ||
    s.key.toUpperCase().includes('DESCRIPTION') ||
    s.key.toUpperCase().includes('CONTACT')
  );

  const otherSettings = settings.filter(s => {
    const key = s.key.toUpperCase();
    return !key.includes('PRICE') &&
      !key.includes('FEE') &&
      !key.includes('COMMISSION') &&
      !key.includes('MARKUP') &&
      !key.includes('DELIVERY') &&
      !key.includes('ENABLED') &&
      !key.includes('FEATURE') &&
      !key.includes('MODE') &&
      !key.includes('MESSAGE') &&
      !key.includes('TEXT') &&
      !key.includes('TITLE') &&
      !key.includes('DESCRIPTION') &&
      !key.includes('CONTACT');
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Remote Configuration</h1>
        <p className="text-muted-foreground">Manage app settings and features without app updates</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add New Setting</CardTitle>
          <CardDescription>Create a new app setting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Setting key"
              value={newSetting.key}
              onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="Value (JSON, boolean, number, or string)"
              value={newSetting.value}
              onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
            />
            <Input
              placeholder="Description (optional)"
              value={newSetting.description}
              onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
            />
          </div>
          <Button
            onClick={handleAddSetting}
            disabled={isSaving || !newSetting.key || !newSetting.value}
            className="w-full"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Setting
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={fetchSettings} variant="outline" size="sm">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
        <Button onClick={() => refresh()} variant="outline" size="sm">
          Sync Config
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-2">
          {pricingSettings.length === 0 ? (
            <p className="text-muted-foreground">No pricing settings found</p>
          ) : (
            pricingSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                onUpdate={handleUpdateSetting}
                onDelete={handleDeleteSetting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-2">
          {featureSettings.length === 0 ? (
            <p className="text-muted-foreground">No feature settings found</p>
          ) : (
            featureSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                onUpdate={handleUpdateSetting}
                onDelete={handleDeleteSetting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-2">
          {contentSettings.length === 0 ? (
            <p className="text-muted-foreground">No content settings found</p>
          ) : (
            contentSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                onUpdate={handleUpdateSetting}
                onDelete={handleDeleteSetting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="other" className="space-y-2">
          {otherSettings.length === 0 ? (
            <p className="text-muted-foreground">No other settings found</p>
          ) : (
            otherSettings.map((setting) => (
              <SettingRow
                key={setting.id}
                setting={setting}
                onUpdate={handleUpdateSetting}
                onDelete={handleDeleteSetting}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({
  setting,
  onUpdate,
  onDelete,
}: {
  setting: Setting;
  onUpdate: (key: string, value: unknown, description?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(renderValue(setting.value));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let value: unknown = editValue;
      if (editValue.startsWith('{') || editValue.startsWith('[')) {
        value = JSON.parse(editValue);
      } else if (editValue === 'true' || editValue === 'false') {
        value = editValue === 'true';
      }
      await onUpdate(setting.key, value, setting.description);
      setIsEditing(false);
    } catch {
      // Error is handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-sm font-semibold text-muted-foreground">Key</label>
            <p className="font-mono text-sm">{setting.key}</p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-muted-foreground">Value</label>
            {isEditing ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="JSON, boolean, number, or string"
              />
            ) : (
              <p className="font-mono text-sm break-all">{renderValue(setting.value)}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(renderValue(setting.value));
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(setting.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-2">{setting.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function renderValue(value: unknown) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
