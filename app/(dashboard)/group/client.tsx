"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Phone,
  Plus,
  Copy,
  Share2,
  QrCode,
  User,
  GraduationCap,
  Loader2,
  Check,
  Shield,
  LogOut,
  UserPlus,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { PageShell } from "@/components/layout";
import { Modal, Avatar, ConfirmModal } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { SCHOOLS } from "@/lib/constants";

interface Group {
  id: string;
  name: string;
  school_name: string | null;
  invite_code: string;
}

interface Member {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  phone: string | null;
  is_driver: boolean;
}

interface Child {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  notes: string | null;
  members: {
    id: string;
    display_name: string | null;
  };
}

interface GroupClientProps {
  group: Group;
  members: Member[];
  groupChildren: Child[];
  currentMember: { id: string; group_id: string; display_name: string | null; role: string };
  userId: string;
}

export function GroupClient({
  group,
  members,
  groupChildren,
  currentMember,
  userId,
}: GroupClientProps) {
  const router = useRouter();
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [confirmDeleteChild, setConfirmDeleteChild] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Child form state
  const [childFirstName, setChildFirstName] = useState("");
  const [childSchool, setChildSchool] = useState("");
  const [childGrade, setChildGrade] = useState("");

  // Join group form state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${group.invite_code}`
    : "";

  const isAdmin = currentMember.role === "admin";
  const isOnlyAdmin = isAdmin && members.filter((m) => m.role === "admin").length === 1;

  // Generate QR code when modal opens
  useEffect(() => {
    if (isQRModalOpen && qrCanvasRef.current && inviteUrl) {
      QRCode.toCanvas(qrCanvasRef.current, inviteUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: "#1B4F72",
          light: "#FFFFFF",
        },
      });
    }
  }, [isQRModalOpen, inviteUrl]);

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function shareInviteLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rejoignez ${group.name} sur KAROSSE`,
          text: `Rejoignez notre groupe de covoiturage scolaire ! Code: ${group.invite_code}`,
          url: inviteUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Erreur lors du partage");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Lien copié !");
      } catch {
        toast.error("Impossible de copier");
      }
    }
  }

  // --- Leave group ---
  async function executeLeaveGroup() {
    setIsLoading(true);
    setConfirmLeave(false);
    const supabase = createBrowserClient();

    try {
      // Delete driver profile if exists
      await supabase
        .from("drivers")
        .delete()
        .eq("member_id", currentMember.id);

      // Delete children
      await supabase
        .from("children")
        .delete()
        .eq("member_id", currentMember.id);

      // Delete member
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", currentMember.id);

      if (error) throw error;

      toast.success("Vous avez quitté le groupe");
      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  // --- Join another group ---
  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoading(true);
    setJoinError(null);
    const supabase = createBrowserClient();

    try {
      const { data: targetGroup, error: groupError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", joinCode.toUpperCase().trim())
        .single();

      if (groupError || !targetGroup) {
        setJoinError("Code d'invitation invalide.");
        setIsLoading(false);
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", userId)
        .eq("group_id", targetGroup.id)
        .single();

      if (existing) {
        setJoinError("Vous êtes déjà membre de ce groupe.");
        setIsLoading(false);
        return;
      }

      const { error: memberError } = await supabase.from("members").insert({
        user_id: userId,
        group_id: targetGroup.id,
        role: "member",
        display_name: currentMember.display_name,
      });

      if (memberError) throw memberError;

      toast.success(`Vous avez rejoint ${targetGroup.name}`);
      setIsJoinModalOpen(false);
      setJoinCode("");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  // --- Children CRUD ---
  function openAddChildModal() {
    setEditingChild(null);
    setChildFirstName("");
    setChildSchool("");
    setChildGrade("");
    setIsChildModalOpen(true);
  }

  function openEditChildModal(child: Child) {
    setEditingChild(child);
    setChildFirstName(child.first_name);
    setChildSchool(child.notes || "");
    setChildGrade(child.grade || "");
    setIsChildModalOpen(true);
  }

  async function handleChildSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childFirstName.trim()) return;

    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      if (editingChild) {
        const { error } = await supabase
          .from("children")
          .update({
            first_name: childFirstName.trim(),
            grade: childGrade || null,
            notes: childSchool || null,
          })
          .eq("id", editingChild.id);

        if (error) throw error;
        toast.success("Enfant modifié");
      } else {
        const { error } = await supabase.from("children").insert({
          member_id: currentMember.id,
          first_name: childFirstName.trim(),
          grade: childGrade || null,
          notes: childSchool || null,
        });

        if (error) throw error;
        toast.success("Enfant ajouté");
      }

      setIsChildModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDeleteChild() {
    if (!editingChild) return;
    setConfirmDeleteChild(true);
  }

  async function executeDeleteChild() {
    if (!editingChild) return;

    setIsLoading(true);
    setConfirmDeleteChild(false);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", editingChild.id);

      if (error) throw error;

      toast.success("Enfant supprimé");
      setIsChildModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  // Group children by member
  const childrenByMember = groupChildren.reduce((acc, child) => {
    const memberId = child.member_id;
    if (!acc[memberId]) {
      acc[memberId] = {
        memberName: child.members.display_name || "Membre",
        children: [],
      };
    }
    acc[memberId].children.push(child);
    return acc;
  }, {} as Record<string, { memberName: string; children: Child[] }>);

  return (
    <PageShell title={group.name}>
      <div className="space-y-6">
        {/* Section: Invite */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Inviter des membres
          </h2>

          {/* Invite Code */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <span className="text-2xl font-mono font-bold tracking-widest text-primary">
                {group.invite_code}
              </span>
              {copied ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <button
              onClick={shareInviteLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Partager le lien
            </button>
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors"
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
          </div>
        </section>

        {/* Section: Join another group */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <button
            onClick={() => { setIsJoinModalOpen(true); setJoinCode(""); setJoinError(null); }}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Rejoindre un autre groupe
          </button>
        </section>

        {/* Section: Members */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Membres ({members.length})
          </h2>

          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.user_id === userId;
              const displayName = member.display_name || "Membre";

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                >
                  <Avatar name={displayName} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {displayName}
                      </span>
                      {member.role === "admin" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          Vous
                        </span>
                      )}
                    </div>
                  </div>

                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="p-2 text-gray-400 hover:text-primary transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: Children */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Enfants ({groupChildren.length})
            </h2>
            <button
              onClick={openAddChildModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {groupChildren.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Aucun enfant enregistré</p>
              <button
                onClick={openAddChildModal}
                className="mt-2 text-primary hover:underline text-sm"
              >
                Ajouter votre premier enfant
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(childrenByMember).map(([memberId, data]) => {
                const isCurrentMember = memberId === currentMember.id;

                return (
                  <div key={memberId}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      {data.memberName}
                    </p>
                    <div className="space-y-2">
                      {data.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => isCurrentMember && openEditChildModal(child)}
                          disabled={!isCurrentMember}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${
                            isCurrentMember
                              ? "bg-gray-50 hover:bg-gray-100 cursor-pointer"
                              : "bg-gray-50 cursor-default"
                          }`}
                        >
                          <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {child.first_name} {child.last_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {[child.notes, child.grade].filter(Boolean).join(" • ") || "—"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section: Leave group */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <button
            onClick={() => setConfirmLeave(true)}
            disabled={isOnlyAdmin}
            className="w-full flex items-center justify-center gap-2 py-3 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LogOut className="w-5 h-5" />
            Quitter le groupe
          </button>
          {isOnlyAdmin && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Vous êtes le seul admin. Nommez un autre admin avant de quitter.
            </p>
          )}
        </section>
      </div>

      {/* Add/Edit Child Modal */}
      <Modal
        isOpen={isChildModalOpen}
        onClose={() => setIsChildModalOpen(false)}
        title={editingChild ? "Modifier l'enfant" : "Ajouter un enfant"}
      >
        <form onSubmit={handleChildSubmit} className="space-y-4">
          <div>
            <label className="label">Prénom</label>
            <input
              type="text"
              value={childFirstName}
              onChange={(e) => setChildFirstName(e.target.value)}
              placeholder="Prénom de l'enfant"
              className="input"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">École</label>
            <div className="space-y-2">
              {SCHOOLS.map((school) => (
                <label
                  key={school.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    childSchool === school.name
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="school"
                    value={school.name}
                    checked={childSchool === school.name}
                    onChange={(e) => setChildSchool(e.target.value)}
                    className="sr-only"
                  />
                  <span className={childSchool === school.name ? "font-medium text-primary" : "text-gray-700"}>
                    {school.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Classe</label>
            <input
              type="text"
              value={childGrade}
              onChange={(e) => setChildGrade(e.target.value)}
              placeholder="Ex: 6ème A"
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {editingChild && (
              <button
                type="button"
                onClick={handleDeleteChild}
                disabled={isLoading}
                className="px-4 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !childFirstName.trim()}
              className="flex-1 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="QR Code d'invitation"
      >
        <div className="flex flex-col items-center py-4">
          <canvas ref={qrCanvasRef} className="rounded-lg" />
          <p className="mt-4 text-center text-gray-600 text-sm">
            Scannez ce code pour rejoindre le groupe
          </p>
          <p className="mt-2 font-mono font-bold text-primary text-xl">
            {group.invite_code}
          </p>
        </div>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Rejoindre un groupe"
      >
        <form onSubmit={handleJoinGroup} className="space-y-4">
          <div>
            <label className="label">Code d&apos;invitation</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
              placeholder="Ex: J2QMVT"
              className="input font-mono text-center text-lg tracking-widest uppercase"
              maxLength={10}
              autoFocus
            />
          </div>

          {joinError && (
            <p className="text-sm text-danger">{joinError}</p>
          )}

          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            Pour scanner un QR code, utilisez l&apos;appareil photo de votre téléphone
          </p>

          <button
            type="submit"
            disabled={isLoading || joinCode.trim().length < 4}
            className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Rejoindre
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* Delete Child Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteChild}
        onClose={() => setConfirmDeleteChild(false)}
        onConfirm={executeDeleteChild}
        title="Supprimer l'enfant"
        message={`Supprimer ${editingChild?.first_name || ""} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Leave Group Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={executeLeaveGroup}
        title="Quitter le groupe"
        message={`Vous allez quitter ${group.name}. Vos enfants et votre profil conducteur seront supprimés de ce groupe. Cette action est irréversible.`}
        confirmLabel="Quitter"
        variant="danger"
        isLoading={isLoading}
      />
    </PageShell>
  );
}
