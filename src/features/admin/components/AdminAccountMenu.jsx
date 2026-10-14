import { ExternalLink, LogOut, ShieldCheck, MonitorSmartphone, UserRound, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatRole } from '../lib/formatRole';
import { resolveSupabaseAvatarUrl } from '../lib/userAvatar';
import { supabase } from '@/lib/supabase';

export { formatRole };

export function AdminAccountMenu({ user, name, role, signingOut, onSignOut, onRefresh, sidebar = false }) {
  const signedIn = user?.last_sign_in_at;
  const date = signedIn && Number.isFinite(Date.parse(signedIn))
    ? new Intl.DateTimeFormat('en-GB', { dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Colombo' }).format(new Date(signedIn)) : null;
  const rawRole = role || user?.app_metadata?.role || user?.user_metadata?.role || user?.app_metadata?.web_role || (user?.role !== 'authenticated' ? user?.role : null);
  const displayRole = formatRole(rawRole);
  const webIndex = user?.app_metadata?.web_index || user?.user_metadata?.index_number || user?.user_metadata?.web_index || user?.app_metadata?.index_number || user?.index_number || '';
  const indexSegment = webIndex || 'admin';
  const accountUrl = `https://isipathanamedia.online/${encodeURIComponent(indexSegment)}/dashboard/profile`;
  const avatarUrl = resolveSupabaseAvatarUrl(user, supabase);
  const initial = (name || 'A').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={sidebar ? 'adm-account adm-account-trigger' : 'adm-user-dot adm-account-avatar'}
          aria-label="Open account menu"
        >
          {sidebar ? (
            <>
              <Avatar className="adm-avatar adm-account-sidebar-avatar rounded-[9px]">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="adm-avatar-image" />}
                <AvatarFallback className="adm-avatar-fallback rounded-[9px]">{initial}</AvatarFallback>
              </Avatar>
              <div>
                <strong>{name}</strong>
                <small>{displayRole}</small>
              </div>
              <ShieldCheck size={15} />
            </>
          ) : (
            <Avatar className="adm-account-topbar-avatar rounded-full">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="adm-avatar-image" />}
              <AvatarFallback className="adm-avatar-fallback rounded-full">{initial}</AvatarFallback>
            </Avatar>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side={sidebar ? 'right' : 'bottom'}
        sideOffset={sidebar ? 28 : 8}
        collisionPadding={16}
        className="adm-member-menu adm-account-menu"
      >
        {/* Profile Identity Card */}
        <div className="adm-account-card">
          <div className="adm-account-card-header">
            <Avatar className="adm-account-card-avatar rounded-[10px]" aria-hidden="true">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="adm-avatar-image" />}
              <AvatarFallback className="adm-avatar-fallback rounded-[10px]">{initial}</AvatarFallback>
            </Avatar>
            <div className="adm-account-card-info">
              <strong className="adm-account-card-name" title={name}>
                {name}
              </strong>
              <div className="adm-account-card-meta">
                <span className="adm-account-pill-role">{displayRole}</span>
                {webIndex && (
                  <span className="adm-account-pill-index">#{webIndex}</span>
                )}
              </div>
            </div>
          </div>
          {date && (
            <div className="adm-account-card-footer">
              <span className="adm-account-status-dot" aria-hidden="true" />
              <span>Signed in {date}</span>
            </div>
          )}
        </div>

        {/* 2x2 Action Tiles Grid */}
        <div className="adm-account-grid">
          <DropdownMenuItem onSelect={onRefresh} className="adm-account-tile">
            <div className="adm-account-tile-top">
              <span className="adm-account-tile-icon">
                <RefreshCw size={13} />
              </span>
            </div>
            <div className="adm-account-tile-text">
              <strong>Refresh</strong>
              <span>Workspace</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="adm-account-tile">
            <a href={accountUrl} target="_blank" rel="noopener noreferrer">
              <div className="adm-account-tile-top">
                <span className="adm-account-tile-icon">
                  <UserRound size={13} />
                </span>
                <ExternalLink size={10} className="adm-account-tile-ext" aria-hidden="true" />
              </div>
              <div className="adm-account-tile-text">
                <strong>Profile</strong>
                <span>ICMU account</span>
              </div>
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="adm-account-tile">
            <a href={`${accountUrl}#security`} target="_blank" rel="noopener noreferrer">
              <div className="adm-account-tile-top">
                <span className="adm-account-tile-icon">
                  <ShieldCheck size={13} />
                </span>
                <ExternalLink size={10} className="adm-account-tile-ext" aria-hidden="true" />
              </div>
              <div className="adm-account-tile-text">
                <strong>Security</strong>
                <span>Password & 2FA</span>
              </div>
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="adm-account-tile">
            <a href={`${accountUrl}#devices`} target="_blank" rel="noopener noreferrer">
              <div className="adm-account-tile-top">
                <span className="adm-account-tile-icon">
                  <MonitorSmartphone size={13} />
                </span>
                <ExternalLink size={10} className="adm-account-tile-ext" aria-hidden="true" />
              </div>
              <div className="adm-account-tile-text">
                <strong>Devices</strong>
                <span>Login history</span>
              </div>
            </a>
          </DropdownMenuItem>
        </div>

        {/* External note */}
        <p className="adm-account-menu-note">
          Account settings open on the main ICMU site. You may need to sign in there.
        </p>

        <DropdownMenuSeparator className="adm-account-separator" />

        {/* Sign out */}
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={onSignOut}
          className="adm-account-signout-item"
        >
          <LogOut size={14} />
          <span>{signingOut ? 'Signing out...' : 'Sign out of Member'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

