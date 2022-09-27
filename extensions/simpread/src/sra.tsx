import {
  ActionPanel,
  Icon,
  List,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  Action,
  Image,
  LocalStorage,
  Color,
} from '@raycast/api';
import { info } from 'console';
import { readFileSync } from 'fs';
import { useEffect, useState } from 'react';
import { URL } from 'url';

// const TurndownService = require('turndown');

interface Preferences {
  path: string;
}

interface State {
  items?: [];
  error?: Error;
}

interface Unread {
  id: number;
  idx: number;
  url: string;
  title: string;
  hostname: string;
  create: string;
  icon: string;
  archive: boolean;
  favicon?: string;
  markdown?: string;
  desc?: string;
  note?: string;
  tags?: string[];
  annotations?: Annote[];
}

function urlHostname(url: string) {
  try {
    return new URL(url).hostname;
  }
  catch (e) { return e; }
}

interface Annote {
  id: number;
  type: string;
  html: string;
  text: string;
  note?: string;
  tags?: string[];
}

function getDetail(unread: Unread) {
  let ans = '';
  if (unread.annotations) {
    unread.annotations?.forEach(an => {
      // Match if annotation is an image.
      if (/^http[s]?.*\.(png|jpg|jpeg|gif)$/gmi.test(an.text)) { an.text = `![](${an.text})` }
      ans += `${an.text}

> ${an.note}

---

`;
    })
  } else ans += '无笔记';

  return `# ${unread.title}

> ${unread.desc}

## 笔记

${ans}`
}

export default function Command() {
  const [state, setState] = useState<State>({});
  const preferences: Preferences = getPreferenceValues();

  useEffect(() => {
    async function fetchUnrdist() {
      try {
        const favicon = 'favicon@default.png',
          path = await LocalStorage.getItem('simpread_config_path'),
          config = readFileSync(!path ? preferences.path : path + '', 'utf8'),
          unrdist = JSON.parse(config).unrdist,
          items = unrdist
            .map((unread: Unread) => {
              let icon = unread.favicon;
              const now = new Date(unread.create);
              if (unread.favicon == undefined || unread.favicon == '') {
                icon = favicon;
              } else if (unread.favicon.startsWith('//res.wx.qq.com')) {
                icon = 'https:' + unread.favicon;
              } else if (unread.favicon.startsWith('/')) {
                icon = favicon;
              }
              return {
                id: unread.idx,
                archive: unread.archive || false,
                title: unread.title,
                icon: icon,
                create: unread.create,
                annotations: unread.annotations,
                desc: unread.desc,
                url: unread.url,
                hostname: urlHostname(unread.url),
                tags: unread.tags,
                markdown: getDetail(unread),
              };
            })
            .map((info: Unread, idx: number) => (
              info.archive?null:
              <List.Item
                key={idx.toString()}
                title={{
                  value: info.id.toString() + " - " + info.title,
                  tooltip: info.desc || "No description!"
                }}
                accessories={[
                  { icon: info.archive ? Icon.Tray : null, tooltip: "Archived" },
                  { text: (info.annotations != null ? info.annotations.length : 0).toString(), icon: Icon.Pencil },
                  { text: info.create.slice(0, 11) }]}
                icon={{ source: info.icon, mask: Image.Mask.Circle }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open Origin URL" url={info.url} />
                      <Action.Push
                        title="Show Details"
                        target={<Detail
                          markdown={info.markdown}
                          navigationTitle="Post Detail"
                          metadata={
                            <Detail.Metadata>
                              <Detail.Metadata.TagList title="Tags">
                                {
                                  info.archive?<Detail.Metadata.TagList.Item key="archive" text="Archived" />:null
                                }
                                {
                                  info.tags?.map((tag, i) => {
                                    let colors = [Color.Blue, Color.Green, Color.Red, Color.Yellow]
                                    return <Detail.Metadata.TagList.Item key={i} text={tag} color={colors[i % 4]} />
                                  })
                                }
                              </Detail.Metadata.TagList>
                              <Detail.Metadata.Link title="Origin URL" target={info.url} text={info.hostname} />
                              <Detail.Metadata.Label title='Create At' text={info.create} />
                              <Detail.Metadata.Label title='Notes' text={info.annotations?.length.toString()} />
                            </Detail.Metadata>
                          } />}
                        icon={{ source: 'sidebar-right-16' }}
                      />
                      <Action.OpenInBrowser
                        title="Open Local File"
                        url={'http://localhost:7026/reading/' + info.id}
                        icon={Icon.Desktop}
                        shortcut={{ modifiers: ['cmd'], key: 'l' }}
                      />
                      <Action.OpenInBrowser
                        title="Open Annote File"
                        url={'http://localhost:7026/unread/' + info.id}
                        icon={Icon.Desktop}
                        shortcut={{ modifiers: ['cmd'], key: 'a' }}
                      />
                      <Action.OpenInBrowser
                        title="Open URL Scheme"
                        url={'simpread://open?type=unread&idx=' + info.id}
                        icon={Icon.Desktop}
                        shortcut={{ modifiers: ['cmd'], key: 's' }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ));
        setState({ items: items });
      } catch (error) {
        setState({ error: new Error('Something went wrong') });
      }
    }
    fetchUnrdist();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, state.error.toString());
  }

  return <List
    enableFiltering={true}
    navigationTitle="Browse Posts"
    searchBarPlaceholder="Search titles"
    isLoading={state.items === undefined}>
    {state.items}
  </List>;
}
