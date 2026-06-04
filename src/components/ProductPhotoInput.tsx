import { compressImage } from '@/services/imageCompression';

type Props = {
  previewUrl: string | null;
  onImageSelected: (blob: Blob) => void;
  onClear: () => void;
};

export default function ProductPhotoInput({ previewUrl, onImageSelected, onClear }: Props) {
  return (
    <div className="photo-input">
      <span className="field-label">Product photo (optional)</span>
      <div className="photo-input-row">
        {previewUrl ? (
          <img src={previewUrl} alt="Product" className="photo-preview" />
        ) : (
          <div className="photo-preview photo-preview-empty">No photo</div>
        )}
        <div className="photo-input-actions">
          <label className="btn-secondary photo-file-label">
            {previewUrl ? 'Change' : 'Add photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="photo-file-input"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;

                const blob = await compressImage(file);
                onImageSelected(blob);
              }}
            />
          </label>
          {previewUrl ? (
            <button type="button" className="btn-link" onClick={onClear}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
