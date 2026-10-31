import {
  type ReactNode,
  useRef,
  useId,
  useState,
  type CSSProperties,
  useLayoutEffect,
  useEffect,
  Children,
  isValidElement,
  Fragment,
  cloneElement,
  type DragEventHandler,
  type KeyboardEventHandler,
} from 'react'
import { createPortal } from 'react-dom'
import { viewportAnchoredMenuStyle } from '@/features/notes/workspaceHelpers'

function TopBarAction({
  label,
  onClick,
  children,
  tone = 'default',
}: {
  label: string
  onClick: () => void
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      className="hover-bg"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        minHeight: 28,
        minWidth: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        border: 'none',
        borderRadius: 'calc(var(--radius-sm) - 1px)',
        background: 'transparent',
        color: tone === 'danger' ? 'var(--red)' : 'var(--text-secondary)',
        cursor: 'pointer',
        padding: '0 6px',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function TopBarMenuButton({
  label,
  text = '',
  icon,
	  title,
	  description,
	  indicatorTone,
	  tone = 'default',
	  menuAlign = 'right',
	  searchable = false,
	  quickFilters = [],
	  searchLabel,
	  searchPlaceholder = 'Filter actions...',
	  open,
	  onToggle,
	  children,
	}: {
	  label: string
	  text?: string
	  icon?: ReactNode
	  title?: string
	  description?: string
	  indicatorTone?: 'accent' | 'danger'
	  tone?: 'default' | 'muted' | 'accent' | 'danger'
	  menuAlign?: 'left' | 'right'
	  searchable?: boolean
	  quickFilters?: { label: string; query: string }[]
	  searchLabel?: string
	  searchPlaceholder?: string
	  open: boolean
	  onToggle: () => void
	  children: ReactNode
	}) {
  const hasText = text.trim().length > 0
  const color = tone === 'danger' ? 'var(--red)' : tone === 'accent' ? 'var(--accent)' : 'var(--text-secondary)'
  const background = tone === 'accent' ? 'var(--accent-a08)' : tone === 'danger' ? 'color-mix(in srgb, var(--red) 10%, transparent)' : open ? 'var(--bg-white-06)' : 'transparent'
  const border = tone === 'danger' ? 'color-mix(in srgb, var(--red) 30%, var(--border))' : tone === 'accent' ? 'var(--accent-a20)' : open ? 'var(--border)' : 'transparent'
  const indicatorColor = indicatorTone === 'danger' ? 'var(--red)' : indicatorTone === 'accent' ? 'var(--accent)' : undefined
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuId = useId()
  const descriptionId = description ? `${menuId}-description` : undefined
  const pendingOpenFocusRef = useRef<'first' | 'last' | null>(null)
	  const typeaheadRef = useRef('')
	  const typeaheadTimerRef = useRef<number | null>(null)
	  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
	  const [menuQuery, setMenuQuery] = useState('')
	  const normalizedMenuQuery = menuQuery.trim().toLowerCase()
	  const restoreTriggerFocus = () => requestAnimationFrame(() => triggerRef.current?.focus())

  const resetTypeahead = () => {
    typeaheadRef.current = ''
    if (typeaheadTimerRef.current) {
      window.clearTimeout(typeaheadTimerRef.current)
      typeaheadTimerRef.current = null
    }
  }

	  useLayoutEffect(() => {
	    if (!open) {
	      setMenuStyle({})
	      setMenuQuery('')
	      resetTypeahead()
	      return
	    }
    const updateMenuStyle = () => {
      setMenuStyle(viewportAnchoredMenuStyle(triggerRef.current, menuRef.current, menuAlign, 240, 340))
    }
    updateMenuStyle()
    window.addEventListener('resize', updateMenuStyle)
    window.addEventListener('scroll', updateMenuStyle, true)
    return () => {
      window.removeEventListener('resize', updateMenuStyle)
      window.removeEventListener('scroll', updateMenuStyle, true)
    }
  }, [menuAlign, open])

  useEffect(() => () => resetTypeahead(), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && wrapperRef.current?.contains(target)) return
      if (target instanceof Node && menuRef.current?.contains(target)) return
      onToggle()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [onToggle, open])

  useEffect(() => {
    if (!open) return
    if (pendingOpenFocusRef.current === 'last') {
      pendingOpenFocusRef.current = null
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [])
      items[items.length - 1]?.focus()
      return
    }
    pendingOpenFocusRef.current = null
    const active = menuRef.current?.querySelector<HTMLButtonElement>('button[data-active="true"]:not(:disabled)')
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')
    ;(active ?? first)?.focus()
  }, [open])

  const focusMenuItem = (direction: 'next' | 'previous' | 'first' | 'last') => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [])
    if (items.length === 0) return
    if (direction === 'first') {
      items[0].focus()
      return
    }
    if (direction === 'last') {
      items[items.length - 1].focus()
      return
    }
    const currentIndex = Math.max(0, items.findIndex(item => item === document.activeElement))
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % items.length
      : (currentIndex - 1 + items.length) % items.length
    items[nextIndex].focus()
  }

  const focusMenuItemByTypeahead = (key: string) => {
    const normalizedKey = key.toLowerCase()
    typeaheadRef.current = `${typeaheadRef.current}${normalizedKey}`.slice(0, 32)
    if (typeaheadTimerRef.current) window.clearTimeout(typeaheadTimerRef.current)
    typeaheadTimerRef.current = window.setTimeout(() => {
      typeaheadRef.current = ''
      typeaheadTimerRef.current = null
    }, 700)

    const query = typeaheadRef.current
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [])
    if (items.length === 0) return
    const currentIndex = items.findIndex(item => item === document.activeElement)
    const orderedItems = [
      ...items.slice(Math.max(0, currentIndex + 1)),
      ...items.slice(0, Math.max(0, currentIndex + 1)),
    ]
    const match = orderedItems.find(item => (item.getAttribute('aria-label') ?? '').toLowerCase().startsWith(query))
      ?? orderedItems.find(item => (item.getAttribute('aria-label') ?? '').toLowerCase().includes(query))
    match?.focus()
    match?.scrollIntoView?.({ block: 'nearest' })
  }

  const closeMenuAndRestoreFocus = () => {
    if (open) onToggle()
    restoreTriggerFocus()
  }

	  const withMenuItemSelect = (node: ReactNode): ReactNode => Children.map(node, child => {
	    if (!isValidElement<TopBarMenuItemProps & { children?: ReactNode }>(child)) return child
	    if (child.type === Fragment) {
	      return <Fragment>{withMenuItemSelect(child.props.children)}</Fragment>
	    }
	    return cloneElement(child, { onSelect: restoreTriggerFocus })
	  })
	  const menuChildren = withMenuItemSelect(
	    normalizedMenuQuery ? filterTopBarMenuChildren(children, normalizedMenuQuery) : children,
	  )
	  const menuHasMatches = !normalizedMenuQuery || topBarMenuChildrenMatch(children, normalizedMenuQuery)

  return (
    <div
      ref={wrapperRef}
      onBlur={() => {
        if (!open) return
        requestAnimationFrame(() => {
          const active = document.activeElement
          if (active instanceof Node && wrapperRef.current?.contains(active)) return
          if (active instanceof Node && menuRef.current?.contains(active)) return
          onToggle()
        })
      }}
      style={{ position: 'relative', flex: '0 0 auto' }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-describedby={descriptionId}
        title={title ?? label}
        onClick={onToggle}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!open) {
              pendingOpenFocusRef.current = 'first'
              onToggle()
            }
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) {
              pendingOpenFocusRef.current = 'last'
              onToggle()
            }
          }
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            closeMenuAndRestoreFocus()
          }
        }}
        className="hover-bg"
        style={{
          height: 28,
          minWidth: 28,
          maxWidth: 132,
          border: `1px solid ${border}`,
          borderRadius: 'var(--radius-sm)',
          background,
          color,
          cursor: 'pointer',
          padding: icon && !hasText ? 0 : '0 8px',
          fontSize: 11,
          fontWeight: 650,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          whiteSpace: 'nowrap',
          position: 'relative',
        }}
      >
        {icon && (
          <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </span>
        )}
        {hasText && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>}
        {indicatorColor && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: indicatorColor,
              boxShadow: '0 0 0 2px var(--bg-base)',
            }}
          />
        )}
      </button>
      {description && (
        <span
          id={descriptionId}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {description}
        </span>
      )}
      {open && typeof document !== 'undefined' && createPortal((
	        <div
	          ref={menuRef}
	          id={menuId}
	          role="menu"
	          aria-label={label}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              focusMenuItem('next')
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              focusMenuItem('previous')
            }
            if (event.key === 'Home') {
              event.preventDefault()
              focusMenuItem('first')
            }
            if (event.key === 'End') {
              event.preventDefault()
              focusMenuItem('last')
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              closeMenuAndRestoreFocus()
            }
            if (
              searchable &&
              event.key === '/' &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              event.preventDefault()
              searchInputRef.current?.focus()
              searchInputRef.current?.select()
              return
            }
            if (
              event.key.length === 1 &&
              event.key.trim().length > 0 &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              event.preventDefault()
              focusMenuItemByTypeahead(event.key)
            }
          }}
          style={{
            position: 'absolute',
            left: menuAlign === 'left' ? 0 : undefined,
            right: menuAlign === 'right' ? 0 : undefined,
            top: 32,
            zIndex: 120,
            minWidth: 190,
            maxWidth: 'min(280px, calc(100vw - 24px))',
            maxHeight: 'min(340px, calc(100vh - 96px))',
            overflow: 'auto',
            padding: 5,
            border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-panel, #111318)',
            boxShadow: '0 14px 30px var(--overlay-heavy, rgba(0, 0, 0, 0.45))',
            ...menuStyle,
	          }}
	        >
	          {searchable && (
	            <div
	              role="presentation"
	              style={{
	                position: 'sticky',
	                top: -5,
	                zIndex: 1,
	                padding: '4px 4px 6px',
	                background: 'var(--bg-panel, #111318)',
	                borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
	                margin: '-5px -5px 4px',
	              }}
	            >
	              <input
	                ref={searchInputRef}
	                aria-label={searchLabel ?? `Filter ${label}`}
	                value={menuQuery}
	                placeholder={searchPlaceholder}
	                onChange={event => setMenuQuery(event.currentTarget.value)}
	                onKeyDown={event => {
	                  event.stopPropagation()
	                  if (event.key === 'ArrowDown') {
	                    event.preventDefault()
	                    focusMenuItem('first')
	                  }
	                  if (event.key === 'Escape' && menuQuery) {
	                    event.preventDefault()
	                    setMenuQuery('')
	                  }
	                  if (event.key === 'Escape' && !menuQuery) {
	                    event.preventDefault()
	                    closeMenuAndRestoreFocus()
	                  }
	                }}
	                style={{
	                  width: '100%',
	                  height: 28,
	                  border: '1px solid var(--border)',
	                  borderRadius: 'var(--radius-sm)',
	                  background: 'var(--bg-white-03)',
	                  color: 'var(--text-primary)',
	                  padding: '0 8px',
	                  font: 'inherit',
	                  fontSize: 11,
	                  outline: 'none',
	                }}
	              />
	              {quickFilters.length > 0 && (
	                <div
	                  role="presentation"
	                  style={{
	                    display: 'flex',
	                    flexWrap: 'wrap',
	                    gap: 4,
	                    marginTop: 6,
	                  }}
	                >
	                  <button
	                    type="button"
	                    aria-label={`Show all ${label} actions`}
	                    onClick={() => {
	                      setMenuQuery('')
	                      searchInputRef.current?.focus()
	                    }}
	                    style={{
	                      minHeight: 22,
	                      border: `1px solid ${normalizedMenuQuery ? 'var(--border)' : 'var(--accent-a20)'}`,
	                      borderRadius: 'var(--radius-sm)',
	                      background: normalizedMenuQuery ? 'var(--bg-white-03)' : 'var(--accent-a08)',
	                      color: normalizedMenuQuery ? 'var(--text-muted)' : 'var(--accent)',
	                      cursor: 'pointer',
	                      padding: '0 7px',
	                      fontSize: 10,
	                      fontWeight: 650,
	                      lineHeight: 1,
	                    }}
	                  >
	                    All
	                  </button>
	                  {quickFilters.map(filter => {
	                    const active = normalizedMenuQuery === filter.query.trim().toLowerCase()
	                    return (
	                      <button
	                        key={`${filter.label}:${filter.query}`}
	                        type="button"
	                        aria-label={`Filter ${label}: ${filter.label}`}
	                        onClick={() => {
	                          setMenuQuery(filter.query)
	                          searchInputRef.current?.focus()
	                        }}
	                        style={{
	                          minHeight: 22,
	                          border: `1px solid ${active ? 'var(--accent-a20)' : 'var(--border)'}`,
	                          borderRadius: 'var(--radius-sm)',
	                          background: active ? 'var(--accent-a08)' : 'var(--bg-white-03)',
	                          color: active ? 'var(--accent)' : 'var(--text-muted)',
	                          cursor: 'pointer',
	                          padding: '0 7px',
	                          fontSize: 10,
	                          fontWeight: 650,
	                          lineHeight: 1,
	                        }}
	                      >
	                        {filter.label}
	                      </button>
	                    )
	                  })}
	                </div>
	              )}
	            </div>
	          )}
	          {menuChildren}
	          {searchable && normalizedMenuQuery && !menuHasMatches && (
	            <div
	              role="presentation"
	              style={{
	                padding: '10px 8px',
	                color: 'var(--text-muted)',
	                fontSize: 11,
	                lineHeight: 1.4,
	              }}
	            >
	              No matching actions.
	            </div>
	          )}
	        </div>
	      ), document.body)}
    </div>
  )
}

interface TopBarMenuItemProps {
  label: string
  icon?: ReactNode
  detail?: string
  active?: boolean
  disabled?: boolean
  draggable?: boolean
  tone?: 'default' | 'danger'
  onClick?: () => void
  onSelect?: () => void
  onDragStart?: DragEventHandler<HTMLButtonElement>
  onDragOver?: DragEventHandler<HTMLButtonElement>
  onDrop?: DragEventHandler<HTMLButtonElement>
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
}

function topBarMenuItemMatches(
  props: Pick<TopBarMenuItemProps, 'label' | 'detail'>,
  query: string,
): boolean {
  return topBarMenuTextMatches(`${props.label} ${props.detail ?? ''}`, query)
}

function topBarMenuSectionMatches(
  props: { label?: string },
  query: string,
): boolean {
  return topBarMenuTextMatches(props.label ?? '', query)
}

function topBarMenuTextMatches(text: string, query: string): boolean {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  if (normalizedText.includes(normalizedQuery)) return true
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every(token => normalizedText.includes(token))
}

function topBarMenuChildrenMatch(node: ReactNode, query: string): boolean {
  return Children.toArray(node).some(child => {
    if (!isValidElement<TopBarMenuItemProps & { children?: ReactNode }>(child)) return false
    if (child.type === Fragment) return topBarMenuChildrenMatch(child.props.children, query)
    if (child.type === TopBarMenuSection) return topBarMenuSectionMatches(child.props, query)
    return topBarMenuItemMatches(child.props, query)
  })
}

function filterTopBarMenuChildren(node: ReactNode, query: string): ReactNode {
  const filtered: ReactNode[] = []
  let pendingSection: ReactNode | null = null
  let pendingSectionMatches = false

  Children.toArray(node).forEach(child => {
    if (!isValidElement<TopBarMenuItemProps & { children?: ReactNode }>(child)) return
    if (child.type === Fragment) {
      const filteredChildren = filterTopBarMenuChildren(child.props.children, query)
      if (topBarMenuChildrenMatch(filteredChildren, query)) {
        filtered.push(<Fragment key={`filtered-fragment-${filtered.length}`}>{filteredChildren}</Fragment>)
      }
      return
    }

    if (child.type === TopBarMenuSection) {
      pendingSection = child
      pendingSectionMatches = topBarMenuSectionMatches(child.props, query)
      return
    }

    if (pendingSectionMatches || topBarMenuItemMatches(child.props, query)) {
      if (pendingSection) {
        filtered.push(pendingSection)
        pendingSection = null
      }
      filtered.push(child)
    }
  })

  return filtered
}

function TopBarMenuSection({ label }: { label: string }) {
  return (
    <div
      role="presentation"
      style={{
        padding: '7px 8px 4px',
        color: 'var(--text-faint)',
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  )
}

function TopBarMenuItem({
  label,
  icon,
  detail,
  active = false,
  disabled = false,
  draggable = false,
  tone = 'default',
  onClick,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onKeyDown,
}: TopBarMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-label={label}
      data-active={active ? 'true' : undefined}
      draggable={draggable && !disabled}
      disabled={disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      onClick={() => {
        onClick?.()
        onSelect?.()
      }}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: icon ? '18px minmax(0, 1fr)' : 'minmax(0, 1fr)',
        alignItems: 'center',
        columnGap: 7,
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--bg-white-06)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : tone === 'danger' ? 'var(--red)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        padding: '6px 8px',
        textAlign: 'left',
        opacity: disabled ? 0.68 : 1,
      }}
    >
      {icon && (
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tone === 'danger' ? 'var(--red)' : active ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {icon}
        </span>
      )}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: active ? 700 : 600, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {detail && (
          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.25, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {detail}
          </span>
        )}
      </span>
    </button>
  )
}

export { TopBarMenuButton, TopBarMenuSection, TopBarMenuItem }
