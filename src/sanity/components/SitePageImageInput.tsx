'use client';

import { Stack, Text } from '@sanity/ui';
import { useFormValue, type ObjectInputProps, type Path } from 'sanity';
import { getSitePageImageGuidance } from '../imageGuidance';

export default function SitePageImageInput(props: ObjectInputProps) {
  const slotPath = props.path.slice(0, -1) as Path;
  const sourcePath = useFormValue([...slotPath, 'sourcePath'] as Path);
  const label = useFormValue([...slotPath, 'label'] as Path);

  return (
    <Stack gap={2}>
      {props.renderDefault(props)}
      <Text muted>
        {getSitePageImageGuidance(sourcePath, label)}
      </Text>
    </Stack>
  );
}
