import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'react-feather'
import ReactGA from 'react-ga'
import { usePopper } from 'react-popper'
import { useDispatch, useSelector } from 'react-redux'
import { Text } from 'rebass'
import styled from 'styled-components'
import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'

import { useOnClickOutside } from '../../hooks/useOnClickOutside'

import useToggle from '../../hooks/useToggle'
import { AppDispatch, AppState } from '../../state'
import { acceptListUpdate, removeList, selectList } from '../../state/lists/actions'
import { useSelectedListUrl } from '../../state/lists/hooks'
import { CloseIcon, ExternalLink, LinkStyledButton } from '../../theme'
import listVersionLabel from '../../utils/listVersionLabel'
import { parseENSAddress } from '../../utils/parseENSAddress'

import { ButtonOutlined, ButtonPrimary } from '../Button'

import Column from '../Column'
import ListLogo from '../ListLogo'
import Row, { RowBetween } from '../Row'
import { PaddedColumn, Separator, SeparatorDark } from './styleds'
import { useTranslation } from 'react-i18next'

const UnpaddedLinkStyledButton = styled(LinkStyledButton)`
  padding: 0;
  font-size: 1rem;
  opacity: ${({ disabled }) => (disabled ? '0.4' : '1')};
`

const PopoverContainer = styled.div<{ show: boolean }>`
  z-index: 100;
  visibility: ${props => (props.show ? 'visible' : 'hidden')};
  opacity: ${props => (props.show ? 1 : 0)};
  transition: visibility 150ms linear, opacity 150ms linear;
  background: ${({ theme }) => theme.bg2};
  border: 1px solid ${({ theme }) => theme.bg3};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  color: ${({ theme }) => theme.text2};
  border-radius: 0.5rem;
  padding: 1rem;
  display: grid;
  grid-template-rows: 1fr;
  grid-gap: 8px;
  font-size: 1rem;
  text-align: left;
`

const StyledMenu = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
`

const StyledListUrlText = styled.div`
  max-width: 160px;
  opacity: 0.6;
  margin-right: 0.5rem;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
`

function ListOrigin({ listUrl }: { listUrl: string }) {
  const ensName = useMemo(() => parseENSAddress(listUrl)?.ensName, [listUrl])
  const host = useMemo(() => {
    if (ensName) return undefined
    const lowerListUrl = listUrl.toLowerCase()
    if (lowerListUrl.startsWith('ipfs://') || lowerListUrl.startsWith('ipns://')) {
      return listUrl
    }
    try {
      const url = new URL(listUrl)
      return url.host
    } catch (error) {
      return undefined
    }
  }, [listUrl, ensName])
  return <>{ensName ?? host}</>
}

function listUrlRowHTMLId(listUrl: string) {
  return `list-row-${listUrl.replace(/\./g, '-')}`
}

const ListRow = memo(function ListRow({ listUrl, onBack }: { listUrl: string; onBack: () => void }) {
  const listsByUrl = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const selectedListUrl = useSelectedListUrl()
  const dispatch = useDispatch<AppDispatch>()
  const { current: list, pendingUpdate: pending } = listsByUrl[listUrl]

  const isSelected = listUrl === selectedListUrl

  const [open, toggle] = useToggle(false)
  const node = useRef<HTMLDivElement>()
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement>()
  const [popperElement, setPopperElement] = useState<HTMLDivElement>()

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'auto',
    strategy: 'fixed',
    modifiers: [{ name: 'offset', options: { offset: [8, 8] } }]
  })

  useOnClickOutside(node, open ? toggle : undefined)

  const selectThisList = useCallback(() => {
    if (isSelected) return
    ReactGA.event({
      category: 'Lists',
      action: 'Select List',
      label: listUrl
    })

    dispatch(selectList(listUrl))
    onBack()
  }, [dispatch, isSelected, listUrl, onBack])

  const handleAcceptListUpdate = useCallback(() => {
    if (!pending) return
    ReactGA.event({
      category: 'Lists',
      action: 'Update List from List Select',
      label: listUrl
    })
    dispatch(acceptListUpdate(listUrl))
  }, [dispatch, listUrl, pending])

  const handleRemoveList = useCallback(() => {
    ReactGA.event({
      category: 'Lists',
      action: 'Start Remove List',
      label: listUrl
    })
    if (window.prompt(`Please confirm you would like to remove this list by typing REMOVE`) === `REMOVE`) {
      ReactGA.event({
        category: 'Lists',
        action: 'Confirm Remove List',
        label: listUrl
      })
      dispatch(removeList(listUrl))
    }
  }, [dispatch, listUrl])
  const { t } = useTranslation()
  if (!list) return null

  return (
    <Row key={listUrl} align="center" padding="16px" id={listUrlRowHTMLId(listUrl)}>
      {list.logoURI ? (
        <ListLogo style={{ marginRight: '1rem' }} logoURI={list.logoURI} alt={`${list.name} list logo`} />
      ) : (
        <div style={{ width: '24px', height: '24px', marginRight: '1rem' }} />
      )}
      <Column style={{ flex: '1' }}>
        <Row>
          <Text
            fontWeight={isSelected ? 500 : 400}
            fontSize={16}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {list.name}
          </Text>
        </Row>
        <Row
          style={{
            marginTop: '4px'
          }}
        >
          <StyledListUrlText title={listUrl}>
            <ListOrigin listUrl={listUrl} />
          </StyledListUrlText>
        </Row>
      </Column>
      <StyledMenu ref={node as any}>
        <ButtonOutlined
          style={{
            width: '2rem',
            padding: '.8rem .35rem',
            borderRadius: '12px',
            fontSize: '14px',
            marginRight: '0.5rem'
          }}
          onClick={toggle}
          ref={setReferenceElement}
        >
          <DropDown />
        </ButtonOutlined>

        {open && (
          <PopoverContainer show={true} ref={setPopperElement as any} style={styles.popper} {...attributes.popper}>
            <div>{list && listVersionLabel(list.version)}</div>
            <SeparatorDark />
            <ExternalLink href={`https://tokenlists.org/token-list?url=${listUrl}`}>{t('viewList')}</ExternalLink>
            <UnpaddedLinkStyledButton onClick={handleRemoveList} disabled={Object.keys(listsByUrl).length === 1}>
              {t('removeList')}
            </UnpaddedLinkStyledButton>
            {pending && (
              <UnpaddedLinkStyledButton onClick={handleAcceptListUpdate}>Update list</UnpaddedLinkStyledButton>
            )}
          </PopoverContainer>
        )}
      </StyledMenu>
      {isSelected ? (
        <ButtonPrimary
          disabled={true}
          className="select-button"
          style={{ width: '5rem', minWidth: '5rem', padding: '0.5rem .35rem', borderRadius: '12px', fontSize: '14px' }}
        >
          {t('selected')}
        </ButtonPrimary>
      ) : (
        <>
          <ButtonPrimary
            className="select-button"
            style={{
              width: '5rem',
              minWidth: '4.5rem',
              padding: '0.5rem .35rem',
              borderRadius: '12px',
              fontSize: '14px'
            }}
            onClick={selectThisList}
          >
            {t('select')}
          </ButtonPrimary>
        </>
      )}
    </Row>
  )
})

const ListContainer = styled.div`
  flex: 1;
  overflow: auto;
`

export function ListSelect({ onDismiss, onBack }: { onDismiss: () => void; onBack: () => void }) {
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)

  const sortedLists = useMemo(() => {
    const listUrls = Object.keys(lists)
    return listUrls
      .filter(listUrl => {
        return Boolean(lists[listUrl].current)
      })
      .sort((u1, u2) => {
        const { current: l1 } = lists[u1]
        const { current: l2 } = lists[u2]
        if (l1 && l2) {
          return l1.name.toLowerCase() < l2.name.toLowerCase()
            ? -1
            : l1.name.toLowerCase() === l2.name.toLowerCase()
            ? 0
            : 1
        }
        if (l1) return -1
        if (l2) return 1
        return 0
      })
  }, [lists])

  const { t } = useTranslation()
  return (
    <Column style={{ width: '100%', flex: '1 1' }}>
      <PaddedColumn>
        <RowBetween>
          <div>
            <ArrowLeft style={{ cursor: 'pointer' }} onClick={onBack} />
          </div>
          <Text fontWeight={500} fontSize={20}>
            {t('manageList')}
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
      </PaddedColumn>

      <Separator />

      <PaddedColumn gap="14px"></PaddedColumn>

      <Separator />

      <ListContainer>
        {sortedLists.map(listUrl => (
          <ListRow key={listUrl} listUrl={listUrl} onBack={onBack} />
        ))}
      </ListContainer>
      <Separator />
    </Column>
  )
}
