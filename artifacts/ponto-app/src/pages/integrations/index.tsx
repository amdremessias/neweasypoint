import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface LocationRecord {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  isActive: boolean;
}

interface IntegrationRecord {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

function LocationForm({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "Local Principal",
    latitude: "",
    longitude: "",
    radiusMeters: 100,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao salvar local.");
      toast({ title: "Local configurado com sucesso!" });
      onSave();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-foreground">Novo Local de Ponto</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Nome</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Latitude</label>
              <input type="text" required value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="-23.5505" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Longitude</label>
              <input type="text" required value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="-46.6333" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Raio Permitido (metros)</label>
            <input type="number" required min={10} max={10000} value={form.radiusMeters}
              onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
      setLocations(data.locations ?? []);
    } catch {
      toast({ title: "Erro ao carregar integracoes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleLocation = async (id: number, current: boolean) => {
    try {
      const res = await fetch(`/api/integrations/locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Erro.");
      loadData();
    } catch {
      toast({ title: "Erro ao alterar status.", variant: "destructive" });
    }
  };

  const deleteLocation = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;
    try {
      const res = await fetch(`/api/integrations/locations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro.");
      loadData();
    } catch {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integracoes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerenciar integracoes e configuracoes de localizacao</p>
        </div>
      </div>

      {/* Geolocation Section */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Geolocalizacao</h2>
          </div>
          <Button onClick={() => setShowModal(true)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Novo Local
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : locations.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum local configurado.</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione um local para restringir registros de ponto por proximidade.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {locations.map((loc) => (
              <li key={loc.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Lat: {loc.latitude}, Lng: {loc.longitude} | Raio: {loc.radiusMeters}m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleLocation(loc.id, loc.isActive)}
                    className="text-muted-foreground hover:text-primary transition"
                    title={loc.isActive ? "Desativar" : "Ativar"}
                  >
                    {loc.isActive ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={() => deleteLocation(loc.id)}
                    className="text-muted-foreground hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Integrations list */}
      {integrations.length > 0 && (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-foreground">Outras Integracoes</h2>
          </div>
          <ul className="divide-y">
            {integrations.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-sm text-foreground">{i.name}</p>
                  <p className="text-xs text-muted-foreground">Tipo: {i.type}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${i.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {i.isActive ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <LocationForm onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData(); }} />
      )}
    </div>
  );
}
